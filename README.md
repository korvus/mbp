# Les meilleures baguettes de Paris

## Français
### Qu'est-ce que c'est ?
Juste une carte qui recense les boulangeries ayant réussi à se hisser dans le classement des meilleures baguettes de Paris.
[https://bestbaguettes.200.work](https://bestbaguettes.200.work/)

### Pourquoi ce projet ?
Dans le cadre d'une réorientation professionnelle vers la boulangerie, je dois effectuer des formations (PMSMP & divers stages) en boulangerie.
Pour trouver la meilleure formation possible près de chez moi (Paris XXᵉ), j'ai cherché quelles étaient les boulangeries les plus réputées.
Le travail de sélection des meilleures boulangeries de Paris est vaste ; je me suis donc appuyée sur les résultats du [concours de la meilleure baguette de Paris](https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris).

## English
### What is it?
It's simply a map listing the bakeries that made it into the ranking of the best baguettes in Paris.
[https://bestbaguettes.200.work](https://bestbaguettes.200.work/)

### Why this project?
As part of a career change into baking, I have to complete training programs (PMSMP & various internships).
To get the best experience near my home (Paris 20th), I looked for the most renowned bakeries.
Because evaluating every great bakery in Paris is a huge task, I relied on the results of the [Best Baguette in Paris contest](https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris).

## Slovenščina
### Kaj je to?
To je preprosto zemljevid pekarn, ki so se uvrstile na lestvico za najboljšo pariško bageto.
[https://bestbaguettes.200.work](https://bestbaguettes.200.work/)

### Zakaj ta projekt?
V sklopu poklicne prekvalifikacije v pekarstvo moram opraviti usposabljanja (PMSMP in različne prakse).
Da bi našla najboljše usposabljanje v bližini doma (20. okrožje Pariza), sem iskala najbolj priznane pekarne.
Ker je izbor najboljših pariških pekarn zelo obsežen, sem se oprla na rezultate [tekmovanja za najboljšo pariško bageto](https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris).

## Español
### ¿Qué es?
Es un mapa que recopila las panaderías que han entrado en la clasificación de las mejores baguettes de París.
[https://bestbaguettes.200.work](https://bestbaguettes.200.work/)

### ¿Por qué este proyecto?
Como parte de una reconversión profesional hacia la panadería, debo realizar formaciones (PMSMP y varias prácticas).
Para conseguir la mejor experiencia cerca de casa (Distrito 20 de París), busqué cuáles eran las panaderías más reconocidas.
Como seleccionar todas las mejores panaderías de París es un trabajo enorme, me apoyé en los resultados del [concurso de la mejor baguette de París](https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris).

## Deutsch
### Worum geht es?
Es handelt sich um eine Karte mit den Bäckereien, die es in die Rangliste der besten Baguettes von Paris geschafft haben.
[https://bestbaguettes.200.work](https://bestbaguettes.200.work/)

### Warum dieses Projekt?
Im Rahmen meines beruflichen Wechsels in die Bäckerei muss ich Schulungen absolvieren (PMSMP und verschiedene Praktika).
Um die bestmögliche Ausbildung in meiner Nähe (Paris 20. Arrondissement) zu finden, habe ich nach den renommiertesten Bäckereien gesucht.
Da die Auswahl aller Top-Bäckereien in Paris ein enormer Aufwand ist, stützte ich mich auf die Ergebnisse des [Wettbewerbs um das beste Baguette von Paris](https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris).

## Contact / Contacto / Kontakt
[ecrivez.moi@simonertel.net](mailto:ecrivez.moi@simonertel.net)

## Technique
### Test local rapide
`npm start` lance seulement le front React. Cela suffit pour travailler sur l'interface, mais pas pour tester l'endpoint PHP `api/insee.php`.

Dans ce mode:
- le site tourne sur le serveur de dev de React
- le PHP n'est pas execute
- les tuiles live Insee de la modale "Quelques chiffres" resteront en erreur ou en attente

### Test local complet avec PHP
XAMPP n'est pas obligatoire. Le plus simple est d'utiliser le serveur PHP integre.

1. Creer un fichier `passkey.txt` a la racine du projet avec ce format:

```txt
Sirene API Key: VOTRE_CLE_SIRENE
BDM idBank: 000442423
```

2. Installer les dependances si besoin:

```bash
npm ci
```

3. Lancer la preview complete:

```bash
npm run preview
```

Si vous voulez une preview locale plus legere, sans le bruit de `react-snap`, utilisez plutot:

```bash
npm run preview:local
```

4. Ouvrir ensuite:

```txt
http://127.0.0.1:8080
```

Dans ce mode:
- le build est regenere automatiquement au debut de la commande
- le front compile est servi depuis `build/`
- `api/insee.php` est bien execute
- les appels vers Sirene et BDM peuvent etre verifies en conditions proches de la prod
- l'admin locale est aussi lancee sur `http://127.0.0.1:4310`
- `npm run preview` lance aussi `react-snap`, ce qui peut produire des warnings non bloquants sur les pages `404.html`
- `npm run preview:local` evite cette etape et convient mieux pour tester rapidement les donnees live

### Quand utiliser quelle commande ?
- `npm start` : dev front rapide avec hot reload, sans PHP
- `npm run admin` : admin locale seule, si vous ne travaillez que sur les donnees
- `npm run preview` : preview complete proche de la prod, avec build + PHP + admin
- `npm run preview:local` : preview locale avec build + PHP + admin, sans `react-snap`

### XAMPP
XAMPP reste possible si vous preferez Apache, mais ce n'est pas necessaire pour ce projet.
Le serveur PHP integre suffit pour tester:
- le front compile
- l'endpoint PHP
- les appels Insee

### Secrets et production
En production, les secrets ne sont pas versionnes.
La GitHub Action de deploiement:
- build le site
- cree `build/passkey.txt` a partir des secrets GitHub
- deploye ensuite le contenu de `build/` par FTP

Secrets attendus par le workflow:
- `INSEE_SIRENE_API_KEY`
- `INSEE_BAGUETTE_IDBANK`

Valeurs attendues:
- `INSEE_SIRENE_API_KEY` = la cle API publique Sirene
- `INSEE_BAGUETTE_IDBANK` = un idBank BDM, par exemple `000442423` pour la serie mensuelle "Pain baguette (1 kg)"
