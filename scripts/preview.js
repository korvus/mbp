const { spawn } = require('child_process');

const processes = [];
let shuttingDown = false;

function startProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
    ...options
  });

  processes.push(child);

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      process.stderr.write(`[${label}] exited with code ${code}\n`);
      shutdown(code || 1);
    }
  });

  child.on('error', (error) => {
    process.stderr.write(`[${label}] failed to start: ${error.message}\n`);
    shutdown(1);
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 150);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

startProcess('php', 'php', ['-S', '127.0.0.1:8080', '-t', 'build']);
startProcess('admin', process.execPath, ['admin/server.js']);

process.stdout.write('Preview available on http://127.0.0.1:8080\n');
process.stdout.write('Admin available on http://127.0.0.1:4310\n');
