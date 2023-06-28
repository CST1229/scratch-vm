const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const MathUtil = require('../../util/math-util');

/**
 * Class for Dev blocks
 * @constructor
 */
class JgDevBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        // register compiled blocks
        this.runtime.registerCompiledExtensionBlocks('jgDev', this.getCompileInfo());
    }

    // util



    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgDev',
            name: 'Test Extension',
            color1: '#4275f5',
            color2: '#425df5',
            blocks: [
                {
                    opcode: 'stopSound',
                    text: 'stop sound [ID]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ID: { type: ArgumentType.STRING, defaultValue: "id" }
                    }
                },
                {
                    opcode: 'starttimeSound',
                    text: 'start sound [ID] at seconds [SEX]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ID: { type: ArgumentType.SOUND, defaultValue: "name or index" },
                        SEX: { type: ArgumentType.NUMBER, defaultValue: 0 },
                    }
                },
                {
                    opcode: 'transitionSound',
                    text: 'set sound [ID] volume transition to seconds [SEX]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ID: { type: ArgumentType.SOUND, defaultValue: "sound to set fade out effect on" },
                        SEX: { type: ArgumentType.NUMBER, defaultValue: 1 },
                    }
                },
                {
                    opcode: 'logArgs1',
                    text: 'costume input [INPUT] sound input [INPUT2]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: { type: ArgumentType.COSTUME },
                        INPUT2: { type: ArgumentType.SOUND }
                    }
                },
                {
                    opcode: 'logArgs2',
                    text: 'variable input [INPUT] list input [INPUT2]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: { type: ArgumentType.VARIABLE },
                        INPUT2: { type: ArgumentType.LIST }
                    }
                },
                {
                    opcode: 'setEffectName',
                    text: 'set [EFFECT] to [VALUE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        EFFECT: { type: ArgumentType.STRING, defaultValue: "color" },
                        VALUE: { type: ArgumentType.NUMBER, defaultValue: 0 },
                    }
                },
                {
                    opcode: 'setBlurEffect',
                    text: 'set blur [PX]px',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PX: { type: ArgumentType.NUMBER, defaultValue: 0 }
                    }
                },
                {
                    opcode: 'doodooBlockLolol',
                    text: 'ignore blocks inside [INPUT]',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        INPUT: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'ifFalse',
                    text: 'if [INPUT] is false',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        INPUT: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'multiplyTest',
                    text: 'multiply [VAR] by [MULT] then',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        VAR: { type: ArgumentType.STRING, menu: "variable" },
                        MULT: { type: ArgumentType.NUMBER, defaultValue: 4 }
                    }
                },
                {
                    opcode: 'compiledIfNot',
                    text: 'if not [CONDITION] then',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        CONDITION: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'compiledReturn',
                    text: 'return [RETURN]',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    arguments: {
                        RETURN: { type: ArgumentType.STRING, defaultValue: '1' }
                    }
                },
                {
                    opcode: 'compiledOutput',
                    text: 'compiled code',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                // {
                //     opcode: 'whatthescallop',
                //     text: 'bruh',
                //     branchCount: 85,
                //     blockType: BlockType.CONDITIONAL
                // }
            ],
            menus: {
                variable: "getVariablesMenu",
            }
        };
    }
    /**
     * This function is used for any compiled blocks in the extension if they exist.
     * Data in this function is given to the IR & JS generators.
     * Data must be valid otherwise errors may occur.
     * @returns {object} functions that create data for compiled blocks.
     */
    getCompileInfo() {
        return {
            ir: {
                compiledIfNot: (generator, block) => ({
                    kind: 'stack', /* this gets replaced but we still need to say what type of block this is */
                    condition: generator.descendInputOfBlock(block, 'CONDITION'),
                    whenTrue: generator.descendSubstack(block, 'SUBSTACK'),
                    whenFalse: []
                }),
                compiledReturn: (generator, block) => ({
                    kind: 'stack',
                    return: generator.descendInputOfBlock(block, 'RETURN')
                }),
                compiledOutput: () => ({
                    kind: 'input' /* input is output :troll: (it makes sense in the ir & jsgen implementation ok) */
                }),
            },
            js: {
                compiledIfNot: (node, compiler, imports) => {
                    compiler.source += `if (!(${compiler.descendInput(node.condition).asBoolean()})) {\n`;
                    compiler.descendStack(node.whenTrue, new imports.Frame(false));
                    // only add the else branch if it won't be empty
                    // this makes scripts have a bit less useless noise in them
                    if (node.whenFalse.length) {
                        compiler.source += `} else {\n`;
                        compiler.descendStack(node.whenFalse, new imports.Frame(false));
                    }
                    compiler.source += `}\n`;
                },
                compiledReturn: (node, compiler) => {
                    compiler.source += `return ${compiler.descendInput(node.return).asString()};`;
                },
                compiledOutput: (_, compiler, imports) => {
                    const code = Cast.toString(compiler.source);
                    return new imports.TypedInput(JSON.stringify(code), imports.TYPE_STRING);
                }
            }
        }
    }

    // menu
    getVariablesMenu() {
        // menus can only be opened in the editor so use editingTarget
        const target = vm.editingTarget;
        const emptyMenu = [{ text: "", value: "" }];
        if (!target) return emptyMenu;
        if (!target.variables) return emptyMenu;
        const menu = Object.getOwnPropertyNames(target.variables).map(variableId => {
            const variable = target.variables[variableId]
            return {
                text: variable.name,
                value: variable.name,
            }
        });
        // check if menu has 0 items because pm throws an error if theres no items
        return (menu.length > 0) ? menu : emptyMenu;
    }

    // util
    _getSoundIndex(soundName, util) {
        // if the sprite has no sounds, return -1
        const len = util.target.sprite.sounds.length;
        if (len === 0) {
            return -1;
        }

        // look up by name first
        const index = this._getSoundIndexByName(soundName, util);
        if (index !== -1) {
            return index;
        }

        // then try using the sound name as a 1-indexed index
        const oneIndexedIndex = parseInt(soundName, 10);
        if (!isNaN(oneIndexedIndex)) {
            return MathUtil.wrapClamp(oneIndexedIndex - 1, 0, len - 1);
        }

        // could not be found as a name or converted to index, return -1
        return -1;
    }



    _getSoundIndexByName(soundName, util) {
        const sounds = util.target.sprite.sounds;
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i].name === soundName) {
                return i;
            }
        }
        // if there is no sound by that name, return -1
        return -1;
    }

    // blocks

    stopSound(args, util) {
        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;

        const soundBank = sprite.soundBank
        if (!soundBank) return;

        const id = Cast.toString(args.ID);
        soundBank.stop(target, id);
    }
    starttimeSound(args, util) {
        const id = Cast.toString(args.ID);
        const index = this._getSoundIndex(id, util);
        if (index < 0) return;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        if (!sprite.sounds) return;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank
        if (!soundBank) return;

        soundBank.playSound(target, soundId, Cast.toNumber(args.SEX));
    }
    transitionSound(args, util) {
        const id = Cast.toString(args.ID);
        const index = this._getSoundIndex(id, util);
        if (index < 0) return;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        if (!sprite.sounds) return;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank
        if (!soundBank) return;

        soundBank.soundPlayers[soundId].stopFadeDecay = Cast.toNumber(args.SEX);
    }

    logArgs1(args) {
        console.log(args)
        return JSON.stringify(args)
    }
    logArgs2(args) {
        console.log(args)
        return JSON.stringify(args)
    }

    setEffectName(args, util) {
        const PX = Cast.toNumber(args.VALUE)
        util.target.setEffect(args.EFFECT, PX)
    }
    setBlurEffect(args, util) {
        const PX = Cast.toNumber(args.PX)
        util.target.setEffect("blur", PX)
    }

    doodooBlockLolol(args, util) {
        if (args.INPUT === true) return
        console.log(args, util)
        util.startBranch(1, false)
        console.log(util.target.getCurrentCostume())
    }

    ifFalse(args, util) {
        console.log(args, util)
        if (!args.INPUT) {
            util.startBranch(1, false)
        }
    }
    // compiled blocks should have interpreter versions
    compiledIfNot(args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (!condition) {
            util.startBranch(1, false);
        }
    }
    compiledReturn() {
        return 'noop';
    }
    compiledOutput() {
        return '<unavailable without compiler>';
    }

    multiplyTest(args, util) {
        const target = util.target;
        Object.getOwnPropertyNames(target.variables).forEach(variableId => {
            const variable = target.variables[variableId];
            if (variable.name !== Cast.toString(args.VAR)) return;
            console.log(variable)
            if (typeof variable.value !== 'number') {
                variable.value = 0;
            }
            variable.value *= Cast.toNumber(args.MULT);
        });
    }

    whatthescallop(_, util) {
        for (let i = 0; i < 85; i++) {
            util.startBranch(i + 1, false)
        }
    }
}

module.exports = JgDevBlocks;
