const readline = require('readline');
const Mute = require('mute-stream');

const read = (opts, cb) => {
  if (opts.num) {
    throw new Error('read() no longer accepts a char number limit');
  }

  if (typeof opts.default !== 'undefined' &&
      typeof opts.default !== 'string' &&
      typeof opts.default !== 'number') {
    throw new Error('default value must be string or number');
  }

  const input = opts.input || process.stdin;
  let output = opts.output || process.stdout;
  const prompt = `${(opts.prompt || '').trim()} `;
  const silent = opts.silent;
  const editDef = false;
  const timeout = opts.timeout;

  const def = opts.default || '';

  if (def) {
    if (silent) {
      prompt += '(<default hidden>) ';
    } else if (opts.edit) {
      editDef = true;
    } else {
      prompt += `(${def})`;
    }
  }
  const terminal = !!(opts.terminal || output.isTTY);
  const m = new Mute({ replace: opts.replace, prompt: prompt });
        m.pipe(output, { end: false });
  output = m;
  const rlOpts = {
    input: input,
    output: output,
    terminal: terminal
  };

  const rl = readline.createInterface(rlOpts.input, rlOpts.output);

  output.unmute();
  rl.setPrompt(prompt);
  rl.prompt();
  if (silent) {
    output.mute();
  } else if (editDef) {
    rl.line = def;
    rl.cursor = def.length;
    rl._refreshLine();
  }

  let called = false;
  rl.on('line', onLine);
  rl.on('error', onError);

  rl.on('SIGINT', () => {
    rl.close();
    onError(new Error('canceled'));
  });

  let timer;
  if (timeout) {
    timer = setTimeout(() => {
      onError(new Error('timed out'));
    }, timeout);
  }

  const done = () => {
    called = true;
    rl.close();

    clearTimeout(timer);
    output.mute();
    output.end();
  }

  const onError = er => {
    if (called) {
      return;
    }
    done();
    return cb(er);
  }

  const onLine = line => {
    if (called) {
      return;
    }
    if (silent && terminal) {
      output.unmute();
    }
    done();
    // truncate the \n at the end.
    line = line.replace(/\r?\n$/, '');
    const isDefault = !!(editDef && line === def);
    if (def && !line) {
      isDefault = true;
      line = def;
    }
    cb(null, line, isDefault);
  }
}

module.exports = read;
