module.exports = {
  apps: [{
    name: 'dino-api',
    script: 'src/index.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register',
    instances: 1,
    watch: true
  }, {
    name: 'dino-worker',
    script: 'src/worker.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register',
    instances: 1,
    watch: true
  }]
};