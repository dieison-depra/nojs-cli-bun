import { describe, it, expect } from '@jest/globals';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const BIN = resolve(import.meta.dirname, '..', 'bin', 'nojs.js');
const run = (args) => execSync(`node ${BIN} ${args}`, { encoding: 'utf-8' });

describe('nojs CLI', () => {
  it('shows help with --help', () => {
    const output = run('--help');
    expect(output).toContain('nojs — Official CLI');
    expect(output).toContain('init');
    expect(output).toContain('prebuild');
    expect(output).toContain('dev');
    expect(output).toContain('validate');
    expect(output).toContain('plugin');
  });

  it('shows help with no arguments', () => {
    const output = run('');
    expect(output).toContain('nojs — Official CLI');
  });

  it('shows version with --version', () => {
    const output = run('--version');
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('shows error for unknown command', () => {
    try {
      run('foobar');
    } catch (err) {
      expect(err.stderr).toContain('Unknown command');
    }
  });

  it('shows subcommand help for init --help', () => {
    const output = run('init --help');
    expect(output).toContain('nojs init');
    expect(output).toContain('wizard');
  });

  it('shows subcommand help for prebuild --help', () => {
    const output = run('prebuild --help');
    expect(output).toContain('nojs prebuild');
  });

  it('shows subcommand help for dev --help', () => {
    const output = run('dev --help');
    expect(output).toContain('nojs dev');
  });

  it('shows subcommand help for validate --help', () => {
    const output = run('validate --help');
    expect(output).toContain('nojs validate');
  });

  it('shows subcommand help for plugin --help', () => {
    const output = run('plugin --help');
    expect(output).toContain('nojs plugin');
  });

  it('lists prebuild plugins with prebuild --list', () => {
    const output = run('prebuild --list');
    expect(output).toContain('inject-resource-hints');
    expect(output).toContain('inject-head-attrs');
    expect(output).toContain('inject-speculation-rules');
    expect(output).toContain('inject-og-twitter');
    expect(output).toContain('generate-sitemap');
    expect(output).toContain('optimize-images');
  });
});
