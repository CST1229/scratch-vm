const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px

const blocks = `
<block type="operator_randomBoolean" />
${blockSeparator}
<block type="operator_nand" />
<block type="operator_nor" />
<block type="operator_xor" />
<block type="operator_xnor" />
${blockSeparator}
<block type="operator_countAppearTimes">
    <value name="TEXT1">
        <shadow type="text">
            <field name="TEXT">a</field>
        </shadow>
    </value>
    <value name="TEXT2">
        <shadow type="text">
            <field name="TEXT">abc abc abc</field>
        </shadow>
    </value>
</block>
<block type="operator_readLineInMultilineText">
    <value name="LINE">
        <shadow type="math_number">
            <field name="NUM">1</field>
        </shadow>
    </value>
    <value name="TEXT">
        <shadow type="text">
            <field name="TEXT">Text with multiple lines here</field>
        </shadow>
    </value>
</block>
<block type="operator_textIncludesLetterFrom">
    <value name="TEXT1">
        <shadow type="text">
            <field name="TEXT">abcdef</field>
        </shadow>
    </value>
    <value name="TEXT2">
        <shadow type="text">
            <field name="TEXT">fgh</field>
        </shadow>
    </value>
</block>
${blockSeparator}
<block type="operator_character_to_code">
    <value name="ONE">
        <shadow type="text">
            <field name="TEXT">a</field>
        </shadow>
    </value>
</block>
<block type="operator_code_to_character">
    <value name="ONE">
        <shadow type="text">
            <field name="TEXT">97</field>
        </shadow>
    </value>
</block>
${blockSeparator}
`+/* new blocks */`
%b18> `+/* exactly equals */`
${blockSeparator}
%b6> `+/* part of ratio */`
%b7> `+/* simplify of ratio */`
${blockSeparator}
%b12> `+/* is number multiple of number */`
%b15> `+/* is number even */`
%b13> `+/* is number int */`
%b14> `+/* is number prime */`
%b11> `+/* trunc number */`
${blockSeparator}
%b16> `+/* reverse text */`
%b17> `+/* shuffle text */`
${blockSeparator}
`+/* join blocks */`
<block type="operator_join">
    <value name="STRING1">
        <shadow type="text">
            <field name="TEXT">apple </field>
        </shadow>
    </value>
    <value name="STRING2">
        <shadow type="text">
            <field name="TEXT">banana</field>
        </shadow>
    </value>
</block>
<block type="operator_join3">
    <value name="STRING1">
        <shadow type="text">
            <field name="TEXT">apple </field>
        </shadow>
    </value>
    <value name="STRING2">
        <shadow type="text">
            <field name="TEXT">banana </field>
        </shadow>
    </value>
    <value name="STRING3">
        <shadow type="text">
            <field name="TEXT">pear</field>
        </shadow>
    </value>
</block>
`+/* extreme join blocks */`
%b0>
%b1>
%b2>
%b3>
%b4>
%b5>
`+/* constants */`
${blockSeparator}
%b8> `+/* pi */`
%b9> `+/* euler */`
%b10> `+/* inf */`
${blockSeparator}
`

function generateJoin(amount) {
    const joinWords = [
        'apple',
        'banana',
        'pear',
        'orange',
        'mango',
        'strawberry',
        'pineapple',
        'grape',
        'kiwi'
    ]

    const argumentTextArray = [];
    const argumentss = {};

    for (let i = 0; i < amount; i++) {
        argumentTextArray.push('[STRING' + (i + 1) + ']');
        argumentss['STRING' + (i + 1)] = {
            type: ArgumentType.STRING,
            defaultValue: joinWords[i] + ((i === (amount - 1)) ? '' : ' ')
        }
    }

    return {
        opcode: 'join' + amount,
        text: 'join ' + argumentTextArray.join(' '),
        blockType: BlockType.REPORTER,
        disableMonitor: true,
        arguments: argumentss
    }
}

/**
 * Class of 2023
 * @constructor
 */
class pmOperatorsExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
    }

    orderCategoryBlocks(extensionBlocks) {
        let categoryBlocks = blocks;

        let idx = 0;
        for (const block of extensionBlocks) {
            categoryBlocks = categoryBlocks.replace('%b' + idx + '>', block);
            idx++;
        }

        return [categoryBlocks];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'pmOperatorsExpansion',
            name: 'Operators Expansion',
            color1: '#59C059',
            color2: '#46B946',
            color3: '#389438',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                generateJoin(4),
                generateJoin(5),
                generateJoin(6),
                generateJoin(7),
                generateJoin(8),
                generateJoin(9),
                {
                    opcode: 'partOfRatio',
                    text: '[PART] part of ratio [RATIO]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        PART: {
                            type: ArgumentType.STRING,
                            menu: "part"
                        },
                        RATIO: {
                            type: ArgumentType.STRING,
                            defaultValue: "1:2"
                        }
                    }
                },
                {
                    opcode: 'simplifyRatio',
                    text: 'simplify ratio [RATIO]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        RATIO: {
                            type: ArgumentType.STRING,
                            defaultValue: "1:2"
                        }
                    }
                },
                {
                    opcode: 'pi',
                    text: 'π',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'euler',
                    text: 'e',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'infinity',
                    text: '∞',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'truncateNumber',
                    text: 'truncate number [NUM]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "2.5"
                        }
                    }
                },
                {
                    opcode: 'isNumberMultipleOf',
                    text: 'is [NUM] multiple of [MULTIPLE]?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "20"
                        },
                        MULTIPLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "10"
                        },
                    }
                },
                {
                    opcode: 'isInteger',
                    text: 'is [NUM] an integer?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0.5"
                        },
                    }
                },
                {
                    opcode: 'isPrime',
                    text: 'is [NUM] a prime number?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "13"
                        },
                    }
                },
                {
                    opcode: 'isEven',
                    text: 'is [NUM] even?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "4"
                        },
                    }
                },
                {
                    opcode: 'reverseChars',
                    text: 'reverse [TEXT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello!"
                        },
                    }
                },
                {
                    opcode: 'shuffleChars',
                    text: 'shuffle [TEXT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello!"
                        },
                    }
                },
                {
                    opcode: 'exactlyEqual',
                    text: '[ONE] exactly equals [TWO]?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        ONE: {
                            type: ArgumentType.STRING,
                            defaultValue: "a"
                        },
                        TWO: {
                            type: ArgumentType.STRING,
                            defaultValue: "b"
                        },
                    }
                },
            ],
            menus: {
                part: {
                    acceptReporters: true,
                    items: [
                        "first",
                        "last"
                    ].map(item => ({ text: item, value: item }))
                }
            }
        };
    }

    // util
    reduce(numerator, denominator) {
        let gcd = function gcd(a, b) {
            return b ? gcd(b, a % b) : a;
        };
        gcd = gcd(numerator, denominator);
        return [numerator / gcd, denominator / gcd];
    }
    checkPrime(number) {
        number = Math.trunc(number);
        if (number <= 1) return false;
        for (var i = 2; i < number; i++) {
            if (number % i === 0) {
                return false;
            }
        }
        return true;
    }

    // useful
    pi() {
        return Math.PI;
    }
    euler() {
        return Math.E;
    }
    infinity() {
        return Infinity;
    }

    partOfRatio(args) {
        const ratio = Cast.toString(args.RATIO);
        const part = Cast.toString(args.PART).toLowerCase();

        if (!ratio.includes(':')) return '';
        const split = ratio.split(':');

        const section = split[Number(part === 'last')];
        return Cast.toNumber(section);
    }
    simplifyRatio(args) {
        const ratio = Cast.toString(args.RATIO);
        if (!ratio.includes(':')) return '';
        const split = ratio.split(':');

        const first = Cast.toNumber(split[0]);
        const last = Cast.toNumber(split[1]);

        const reduced = this.reduce(first, last);

        return Cast.toNumber(reduced[0]) + ':' + Cast.toNumber(reduced[1]);
    }

    truncateNumber(args) {
        const num = Cast.toNumber(args.NUM);
        return Math.trunc(num);
    }

    isNumberMultipleOf(args) {
        const num = Cast.toNumber(args.NUM);
        const mult = Cast.toNumber(args.MULTIPLE);
        
        return (num % mult) === 0;
    }
    isInteger(args) {
        const num = Cast.toNumber(args.NUM);
        return Math.trunc(num) === num;
    }
    isPrime(args) {
        const num = Cast.toNumber(args.NUM);
        return this.checkPrime(num);
    }
    isEven(args) {
        const num = Cast.toNumber(args.NUM);
        return num % 2 == 0;
    }

    exactlyEqual(args) {
        // everyone requested this but watch literally no one use it
        return args.ONE === args.TWO;
    }

    reverseChars(args) {
        const text = Cast.toString(args.TEXT);
        const split = text.split('');
        return split.reverse().join('');
    }
    shuffleChars(args) {
        const text = Cast.toString(args.TEXT);
        const split = text.split('');
        const shuffled = split.sort(() => Math.random() - 0.5);
        return shuffled.join('');
    }

    // join
    join4(args) {
        return Cast.toString(args.STRING1)
            + Cast.toString(args.STRING2)
            + Cast.toString(args.STRING3)
            + Cast.toString(args.STRING4);
    }
    join5(args) {
        return Cast.toString(args.STRING1)
            + Cast.toString(args.STRING2)
            + Cast.toString(args.STRING3)
            + Cast.toString(args.STRING4)
            + Cast.toString(args.STRING5);
    }
    join6(args) {
        return Cast.toString(args.STRING1)
            + Cast.toString(args.STRING2)
            + Cast.toString(args.STRING3)
            + Cast.toString(args.STRING4)
            + Cast.toString(args.STRING5)
            + Cast.toString(args.STRING6);
    }
    join7(args) {
        return Cast.toString(args.STRING1)
            + Cast.toString(args.STRING2)
            + Cast.toString(args.STRING3)
            + Cast.toString(args.STRING4)
            + Cast.toString(args.STRING5)
            + Cast.toString(args.STRING6)
            + Cast.toString(args.STRING7);
    }
    join8(args) {
        return Cast.toString(args.STRING1)
            + Cast.toString(args.STRING2)
            + Cast.toString(args.STRING3)
            + Cast.toString(args.STRING4)
            + Cast.toString(args.STRING5)
            + Cast.toString(args.STRING6)
            + Cast.toString(args.STRING7)
            + Cast.toString(args.STRING8);
    }
    join9(args) {
        return Cast.toString(args.STRING1)
            + Cast.toString(args.STRING2)
            + Cast.toString(args.STRING3)
            + Cast.toString(args.STRING4)
            + Cast.toString(args.STRING5)
            + Cast.toString(args.STRING6)
            + Cast.toString(args.STRING7)
            + Cast.toString(args.STRING8)
            + Cast.toString(args.STRING9);
    }
}

module.exports = pmOperatorsExpansion;
