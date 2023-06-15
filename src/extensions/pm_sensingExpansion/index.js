const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px

const blocks = `
<block type="sensing_thing_has_number">
    <value name="TEXT1">
        <shadow type="text">
            <field name="TEXT">abc 10 def</field>
        </shadow>
    </value>
</block>
<block type="sensing_isUpperCase">
    <value name="text">
        <shadow type="text">
            <field name="TEXT">A</field>
        </shadow>
    </value>
</block>
<block type="sensing_regextest">
    <value name="text">
        <shadow type="text">
            <field name="TEXT">foo bar</field>
        </shadow>
    </value>
    <value name="reg">
        <shadow type="text">
            <field name="TEXT">foo</field>
        </shadow>
    </value>
    <value name="regrule">
        <shadow type="text">
            <field name="TEXT">g</field>
        </shadow>
    </value>
</block>
${blockSeparator}
<block type="sensing_getspritewithattrib">
    <value name="var">
        <shadow type="text">
            <field name="TEXT">my variable</field>
        </shadow>
    </value>
    <value name="val">
        <shadow type="text">
            <field name="TEXT">0</field>
        </shadow>
    </value>
</block>
%b10>
${blockSeparator}
%b6>
%b9>
%b11>
%b12>
${blockSeparator}
<block type="sensing_getoperatingsystem"/>
<block type="sensing_getbrowser"/>
<block type="sensing_geturl"/>
${blockSeparator}
%b7>
%b5>
%b8>
%b4>
${blockSeparator}
%b3>
${blockSeparator}
%b0>
%b1>
${blockSeparator}
%b2>
`;

/**
 * Class of 2023
 * @constructor
 */
class pmSensingExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        this.canVibrate = true;
    }

    orderCategoryBlocks(extensionBlocks) {
        let categoryBlocks = blocks;

        let idx = 0;
        for (const block of extensionBlocks) {
            categoryBlocks = categoryBlocks.replace(`%b${idx}>`, block);
            idx++;
        }

        return [categoryBlocks];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'pmSensingExpansion',
            name: 'Sensing Expansion',
            color1: "#5CB1D6",
            color2: "#47A8D1",
            color3: "#2E8EB8",
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                {
                    opcode: 'batteryPercentage',
                    text: 'battery percentage',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'batteryCharging',
                    text: 'is device charging?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                {
                    opcode: 'vibrateDevice',
                    text: 'vibrate',
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'browserLanguage',
                    text: 'preferred language',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'urlOptions',
                    text: 'url [OPTIONS]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        OPTIONS: {
                            type: ArgumentType.STRING,
                            menu: "urlSections"
                        }
                    }
                },
                {
                    opcode: 'urlOptionsOf',
                    text: '[OPTIONS] of url [URL]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        OPTIONS: {
                            type: ArgumentType.STRING,
                            menu: "urlSections"
                        },
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://home.penguinmod.site:3000/some/random/page?param=10#20"
                        }
                    }
                },
                {
                    opcode: 'setUsername',
                    text: 'set username to [NAME]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "Penguin"
                        }
                    }
                },
                {
                    opcode: 'setUrlEnd',
                    text: 'set url path to [PATH]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PATH: {
                            type: ArgumentType.STRING,
                            defaultValue: "?parameter=10#you-can-change-these-without-refreshing"
                        }
                    }
                },
                {
                    opcode: 'queryParamOfUrl',
                    text: 'query parameter [PARAM] of url [URL]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        PARAM: {
                            type: ArgumentType.STRING,
                            defaultValue: "param"
                        },
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://penguinmod.site/?param=10"
                        }
                    }
                },
                {
                    opcode: 'packaged',
                    text: 'project packaged?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                {
                    opcode: 'spriteName',
                    text: 'sprite name',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'framed',
                    text: 'project in iframe?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                {
                    opcode: 'currentMillisecond',
                    text: 'current millisecond',
                    blockType: BlockType.REPORTER,
                    disableMonitor: false
                },
            ],
            menus: {
                urlSections: {
                    acceptReporters: true,
                    items: [
                        "protocol",
                        "host",
                        "hostname",
                        "port",
                        "pathname",
                        "search",
                        "hash",
                        "origin",
                        "subdomain",
                        "path"
                    ].map(item => ({ text: item, value: item }))
                }
            }
        };
    }

    // util
    urlOptionFromObject(option, urlObject) {
        const validOptions = [
            "protocol",
            "host",
            "hostname",
            "port",
            "pathname",
            "search",
            "hash",
            "origin",
            "subdomain",
            "path"
        ];
        if (!validOptions.includes(option)) return '';

        switch (option) {
        case 'subdomain': {
            const origin = urlObject.origin;
            if (origin.split('.').length <= 2) return '';
            const splitSubdomain = origin.split('.')[0];
            const subdomain = splitSubdomain.split('//')[1];
            if (!subdomain) return '';
            return subdomain.replace(/\./gmi, '');
        }
        case 'path': {
            const origin = urlObject.origin;
            if (origin.endsWith('/')) {
                return urlObject.href.replace(origin, '');
            }
            return urlObject.href.replace(`${origin}/`, '');
        }
        case 'search': {
            const params = new URLSearchParams(location.search.substring(1));
            if (params.size === 0) return "";
            for (const str of params.keys()) {
                if (str === "save_url" || str === "project_url" || str === "save_thumb") {
                    params.delete(str);
                }
            }
            return `?${params.toString()}`;
        }
        }

        return Cast.toString(urlObject[option]);
    }
    validateUrl(url) {
        let valid = true;
        try {
            new URL(url);
        } catch {
            valid = false;
        }
        return valid;
    }

    // blocks
    batteryPercentage() {
        if ('getBattery' in navigator) {
            return new Promise(resolve => {
                navigator.getBattery().then(batteryManager => {
                    resolve(batteryManager.level * 100);
                })
                    .catch(() => 100);
            });
        } 
        return 100;
        
    }
    batteryCharging() {
        if ('getBattery' in navigator) {
            return new Promise(resolve => {
                navigator.getBattery().then(batteryManager => {
                    resolve(batteryManager.charging);
                })
                    .catch(() => true);
            });
        } 
        return true;
        
    }

    vibrateDevice() {
        // avoid vibration spam
        // only vibrate every 1s
        if (!this.canVibrate) return;

        if ('vibrate' in navigator) {
            this.canVibrate = false;
            navigator.vibrate(250);
            setTimeout(() => {
                this.canVibrate = true;
            }, 1000);
        }
    }

    browserLanguage() {
        if (!('language' in navigator)) return 'Unknown';
        const lang = Cast.toString(navigator.language);
        const check = lang.split("-")[0].toLowerCase();

        switch (check) {
        case 'en':
            return 'English';
        case 'es':
            return 'Spanish';
        case 'fr':
            return 'French';
        case 'it':
            return 'Italian';
        case 'pt':
            return 'Portuguese';
        case 'de':
            return 'German';
        case 'ru':
            return 'Russian';
        case 'ar':
            return 'Arabic';
        case 'zh':
            return 'Chinese (Mandarin)';
        case 'he':
            return 'Hebrew';
        case 'ja':
            return 'Japanese';
        case 'ko':
            return 'Korean';
        case 'sw':
            return 'Swahili';
        case 'sq':
            return 'Albanian';
        case 'hy':
            return 'Armenian';
        case 'eu':
            return 'Basque';
        case 'nl':
            return 'Dutch';
        case 'ka':
            return 'Georgian';
        case 'gd':
            return 'Scottish Gaelic';
        case 'ga':
            return 'Modern Irish';
        case 'fa':
            return 'Persian (Farsi)';
        case 'bo':
            return 'Tibetan';
        case 'cy':
            return 'Welsh';
        case 'el':
            return 'Modern Greek';
        case 'grc':
            return 'Ancient Greek';
        case 'la':
            return 'Latin';
        case 'ang':
            return 'Anglo-Saxon';
        case 'enm':
            return 'Middle English';
        default:
            return 'Unknown';
        }
    }

    urlOptions(args) {
        if (!('location' in window)) return ''; // idk how this would fail but funny
        const option = Cast.toString(args.OPTIONS).toLowerCase();
        return this.urlOptionFromObject(option, location);
    }
    urlOptionsOf(args) {
        if (!('location' in window)) return ''; // idk how this would fail but funny
        const option = Cast.toString(args.OPTIONS).toLowerCase();
        const url = Cast.toString(args.URL);
        if (!this.validateUrl(url)) return '';
        return this.urlOptionFromObject(option, new URL(url));
    }

    setUsername(args) {
        const username = Cast.toString(args.NAME);
        vm.postIOData('userData', {
            username: username
        });
    }

    setUrlEnd(args) {
        if (!('history' in window)) return;
        const target = location.origin.endsWith('/') ? location.origin + path : `${location.origin}/${path}`;
        history.replaceState('', '', target);
    }
    queryParamOfUrl(args) {
        if (!('URLSearchParams' in window)) return '';
        const url = Cast.toString(args.URL);
        if (!this.validateUrl(url)) return '';
        const urlObject = new URL(url);
        const queryParams = new URLSearchParams(urlObject.search);
        const str = Cast.toString(args.PARAM);
        return queryParams.get(str);
    }

    packaged() {
        return this.runtime.isPackaged;
    }

    spriteName(_, util) {
        return util.target.getName();
    }

    framed() {
        if (!window.parent) return false;
        return window.parent !== window;
    }

    currentMillisecond() {
        return Date.now() % 1000;
    }
}

module.exports = pmSensingExpansion;
