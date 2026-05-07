<?php

declare(strict_types=1);

const BAGUETTE_WEIGHT_GRAMS = 250;
const DEFAULT_SIRENE_URL = 'https://api.insee.fr/api-sirene/3.11/siret';
const DEFAULT_BDM_URL = 'https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/%s?lastNObservations=1';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600, stale-while-revalidate=86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond([
        'error' => 'method_not_allowed',
    ], 405);
}

$config = loadConfig();

respond([
    'generatedAt' => gmdate(DATE_ATOM),
    'bakeryCount' => fetchParisBakeryCount($config),
    'baguettePrice' => fetchBaguettePrice($config),
]);

function respond(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function loadConfig(): array
{
    $config = [];
    $passkeyPaths = [
        dirname(__DIR__) . DIRECTORY_SEPARATOR . 'passkey.txt',
        dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'passkey.txt',
    ];

    foreach ($passkeyPaths as $passkeyPath) {
        if (!is_file($passkeyPath)) {
            continue;
        }

        $lines = file($passkeyPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            if (!preg_match('/^\s*([^:]+?)\s*:\s*(.*?)\s*$/', $line, $matches)) {
                continue;
            }

            $config[normalizeConfigKey($matches[1])] = $matches[2];
        }

        if ($config !== []) {
            break;
        }
    }

    return $config;
}

function normalizeConfigKey(string $value): string
{
    $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '_', $value) ?? $value;
    return trim($value, '_');
}

function pickConfig(array $config, array $keys, ?string $envName = null): ?string
{
    if ($envName !== null) {
        $envValue = getenv($envName);
        if (is_string($envValue) && trim($envValue) !== '') {
            return trim($envValue);
        }
    }

    foreach ($keys as $key) {
        if (isset($config[$key]) && trim((string) $config[$key]) !== '') {
            return trim((string) $config[$key]);
        }
    }

    return null;
}

function fetchParisBakeryCount(array $config): array
{
    $sireneApiKey = pickConfig(
        $config,
        ['sirene_api_key', 'insee_sirene_api_key', 'api_key'],
        'INSEE_SIRENE_API_KEY'
    );
    $query = 'periode(activitePrincipaleEtablissement:10.71C AND etatAdministratifEtablissement:A AND caractereEmployeurEtablissement:O) AND codeCommuneEtablissement:75*';
    $url = DEFAULT_SIRENE_URL
        . '?q=' . rawurlencode($query)
        . '&date=' . rawurlencode(date('Y-m-d'))
        . '&nombre=0';

    if ($sireneApiKey === null) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $response = requestJson($url, [
        'Accept: application/json',
        'X-INSEE-Api-Key-Integration: ' . $sireneApiKey,
    ]);

    if (!$response['ok']) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $total = $response['body']['header']['total'] ?? null;
    if (!is_numeric($total)) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    return [
        'status' => 'success',
        'value' => (int) $total,
    ];
}

function fetchBaguettePrice(array $config): array
{
    $idbank = pickConfig(
        $config,
        [
            'baguette_idbank',
            'insee_baguette_idbank',
            'bdm_idbank',
            'prix_baguette_idbank',
            'idbank_baguette',
        ],
        'INSEE_BAGUETTE_IDBANK'
    );

    if ($idbank === null) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $url = sprintf(DEFAULT_BDM_URL, rawurlencode($idbank));
    $response = requestXml($url, [
        'Accept: application/xml, text/xml;q=0.9, */*;q=0.8',
    ]);

    if (!$response['ok']) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $seriesNodes = $response['xml']->xpath('//*[local-name()="Series"]');
    if (!$seriesNodes || !isset($seriesNodes[0])) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $series = $seriesNodes[0];
    $title = (string) ($series['TITLE_FR'] ?? '');
    $obsNodes = $series->xpath('./*[local-name()="Obs"]');
    if (!$obsNodes || !isset($obsNodes[0])) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $obs = $obsNodes[0];
    $rawValue = (string) ($obs['OBS_VALUE'] ?? '');
    if (!is_numeric($rawValue)) {
        return [
            'status' => 'error',
            'value' => null,
        ];
    }

    $value = (float) $rawValue;
    if (stripos($title, '(1 kg)') !== false || stripos($title, '1 kg') !== false) {
        $value = $value * (BAGUETTE_WEIGHT_GRAMS / 1000);
    }

    return [
        'status' => 'success',
        'value' => round($value, 2),
    ];
}

function requestJson(string $url, array $headers = []): array
{
    $response = requestRaw($url, $headers);
    if (!$response['ok']) {
        return [
            'ok' => false,
            'body' => null,
        ];
    }

    $body = json_decode($response['body'], true);
    if (!is_array($body)) {
        return [
            'ok' => false,
            'body' => null,
        ];
    }

    return [
        'ok' => true,
        'body' => $body,
    ];
}

function requestXml(string $url, array $headers = []): array
{
    $response = requestRaw($url, $headers);
    if (!$response['ok']) {
        return [
            'ok' => false,
            'xml' => null,
        ];
    }

    $xml = @simplexml_load_string($response['body']);
    if ($xml === false) {
        return [
            'ok' => false,
            'xml' => null,
        ];
    }

    return [
        'ok' => true,
        'xml' => $xml,
    ];
}

function requestRaw(string $url, array $headers = []): array
{
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => $headers,
    ]);

    $body = curl_exec($curl);
    $statusCode = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $error = curl_error($curl);
    curl_close($curl);

    if (!is_string($body) || $body === '' || $error !== '' || $statusCode < 200 || $statusCode >= 300) {
        return [
            'ok' => false,
            'body' => null,
        ];
    }

    return [
        'ok' => true,
        'body' => $body,
    ];
}
