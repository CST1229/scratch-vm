const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const SandboxRunner = require('../../util/sandboxed-javascript-runner');
const Cast = require('../../util/cast');

/**
 * Class
 * oh yea you cant access util in the runner anymore
 * im not adding it because im done with implementing eval in PM since it was done like 3 times
 * @constructor
 */
class jgJavascript {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        this.util;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgJavascript',
            name: 'JavaScript',
            // color1: '#EFC900', look like doo doo
            blocks: [
                {
                    opcode: 'javascriptHat',
                    text: 'when javascript [CODE] == true',
                    blockType: BlockType.HAT,
                    hideFromPalette: true, // this block seems to cause strange behavior because of how sandboxed eval is done
                    arguments: {
                        CODE: {
                            type: ArgumentType.STRING,
                            defaultValue: "Math.round(Math.random()) === 1"
                        }
                    }
                },
                {
                    opcode: 'javascriptStack',
                    text: 'javascript [CODE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        CODE: {
                            type: ArgumentType.STRING,
                            defaultValue: "alert('Hello!')"
                        }
                    }
                },
                {
                    opcode: 'javascriptString',
                    text: 'javascript [CODE]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        CODE: {
                            type: ArgumentType.STRING,
                            defaultValue: "Math.random()"
                        }
                    }
                },
                {
                    opcode: 'javascriptBool',
                    text: 'javascript [CODE]',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        CODE: {
                            type: ArgumentType.STRING,
                            defaultValue: "Math.round(Math.random()) === 1"
                        }
                    }
                }
            ]
        };
    }

    // util
    evaluateCode(code) {
        return "The eval block has been disabled."
        /*
        return new Promise((resolve) => {
            SandboxRunner.execute(code).then(result => {
                // result is { value: any, success: boolean }
                // in PM, we always ignore errors
                return resolve(result.value);
            })
        })
        */
    }

    // blocks
    javascriptStack(args, util) {
        this.util = util;
        const code = Cast.toString(args.CODE);
        return this.evaluateCode(code);
    }
    javascriptString(args, util) {
        this.util = util;
        const code = Cast.toString(args.CODE);
        return this.evaluateCode(code);
    }
    javascriptBool(args, util) {
        this.util = util;
        return new Promise((resolve) => {
            const code = Cast.toString(args.CODE);
            this.evaluateCode(code).then(value => {
                resolve(Boolean(value));
            });
        })
    }
    javascriptHat(...args) {
        // its the same thing lol
        return this.javascriptBool(...args);
    }
}

module.exports = jgJavascript;
