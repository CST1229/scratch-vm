const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const ProjectPermissionManager = require('../../util/project-permissions');
// const Cast = require('../../util/cast');

const EffectOptions = {
    acceptReporters: true,
    items: [
        { text: "color", value: "color" },
        { text: "grayscale", value: "grayscale" },
        { text: "brightness", value: "brightness" },
        { text: "contrast", value: "contrast" },
        { text: "ghost", value: "ghost" },
        { text: "blur", value: "blur" },
        { text: "invert", value: "invert" },
        { text: "saturate", value: "saturate" },
        { text: "sepia", value: "sepia" }
    ]
};

const urlToReportUrl = (url) => {
    let urlObject;
    try {
        urlObject = new URL(url);
    } catch {
        // we cant really throw an error in this state since it halts any blocks
        // or return '' since thatll just confuse the api likely
        // so just use example.com
        return 'example.com';
    }
    // use host name
    return urlObject.hostname;
};

// to avoid taking 1290 years for each url set
// we save the ones that we already checked
const safeOriginUrls = {};

/**
 * uhhhhhhhhhh
 * @param {Array} array the array
 * @param {*} value the value
 * @returns {Object} an object
 */
const ArrayToValue = (array, value) => {
    const object = {};
    array.forEach(item => {
        object[String(item)] = value;
    });
    return object;
};

const isUrlRatedSafe = (url) => {
    return new Promise((resolve) => {
        const saveUrl = urlToReportUrl(url);
        if (safeOriginUrls.hasOwnProperty(saveUrl)) {
            return resolve(safeOriginUrls[saveUrl]);
        }

        fetch(`https://pm-bapi.vercel.app/api/safeurl?url=${saveUrl}`).then(res => {
            if (!res.ok) {
                resolve(true);
                return;
            }
            res.json().then(status => {
                safeOriginUrls[saveUrl] = status.safe;
                resolve(status.safe);
            }).catch(() => resolve(true));
        }).catch(() => resolve(true));
    })
}

/**
 * Class for IFRAME blocks
 * @constructor
 */
class JgIframeBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this.createdIframe = null;
        this.iframeSettings = {
            x: 0,
            y: 0,
            rotation: 90,
            width: 480,
            height: 360
        };
        this.iframeFilters = ArrayToValue(EffectOptions.items.map(item => item.value), 0);
        this.iframeLoadedValue = false;
        this.permission_AllowedWebsites = [];
        this.displayWebsiteUrl = "";
        this.runtime.on('PROJECT_STOP_ALL', () => {
            // stop button clicked so delete the iframe
            this.RemoveIFrame();
        });
    }

    /**
     * dummy function for reseting user provided permisions when a save is loaded
     */
    deserialize () {
        this.permission_AllowedWebsites = [];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'jgIframe',
            name: 'IFrame',
            color1: '#F36518',
            color2: '#E64D18',
            blocks: [
                {
                    opcode: 'createIframeElement',
                    text: formatMessage({
                        id: 'jgIframe.blocks.createIframeElement',
                        default: 'set new iframe',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'deleteIframeElement',
                    text: formatMessage({
                        id: 'jgIframe.blocks.deleteIframeElement',
                        default: 'delete iframe',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'iframeElementExists',
                    text: formatMessage({
                        id: 'jgIframe.blocks.iframeElementExists',
                        default: 'iframe exists?',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                "---",
                "---",
                {
                    opcode: 'whenIframeIsLoaded',
                    text: formatMessage({
                        id: 'jgIframe.blocks.whenIframeIsLoaded',
                        default: 'when iframe loads site',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'setIframeUrl',
                    text: formatMessage({
                        id: 'jgIframe.blocks.setIframeUrl',
                        default: 'set iframe url to [URL]',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://www.example.com"
                        }
                    }
                },
                {
                    opcode: 'setIframePosLeft',
                    text: formatMessage({
                        id: 'jgIframe.blocks.setIframePosLeft',
                        default: 'set iframe x to [X]',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'setIframePosTop',
                    text: formatMessage({
                        id: 'jgIframe.blocks.setIframePosTop',
                        default: 'set iframe y to [Y]',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'setIframeSizeWidth',
                    text: formatMessage({
                        id: 'jgIframe.blocks.setIframeSizeWidth',
                        default: 'set iframe width to [WIDTH]',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 480
                        }
                    }
                },
                {
                    opcode: 'setIframeSizeHeight',
                    text: formatMessage({
                        id: 'jgIframe.blocks.setIframeSizeHeight',
                        default: 'set iframe height to [HEIGHT]',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 360
                        }
                    }
                },
                {
                    opcode: 'setIframeRotation',
                    text: formatMessage({
                        id: 'jgIframe.blocks.setIframeRotation',
                        default: 'point iframe in direction [ROTATE]',
                        description: ''
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ROTATE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: 'showIframeElement',
                    text: formatMessage({
                        id: 'jgIframe.blocks.showIframeElement',
                        default: 'show iframe',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'hideIframeElement',
                    text: formatMessage({
                        id: 'jgIframe.blocks.hideIframeElement',
                        default: 'hide iframe',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'getIframeLeft',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeLeft',
                        default: 'iframe x',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getIframeTop',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeTop',
                        default: 'iframe y',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getIframeWidth',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeWidth',
                        default: 'iframe width',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getIframeHeight',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeHeight',
                        default: 'iframe height',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getIframeRotation',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeRotation',
                        default: 'iframe rotation',
                        description: ''
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getIframeTargetUrl',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeTargetUrl',
                        default: 'iframe target url',
                        description: 'doesnt get the url the iframe is actually on because web browsers are stupid and inconvenient'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'iframeElementIsHidden',
                    text: formatMessage({
                        id: 'jgIframe.blocks.iframeElementIsHidden',
                        default: 'iframe is hidden?',
                        description: 'im too lazy to write these anymore tbh'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                "---",
                "---",
                // effects YAYYAYAWOOHOOO YEEAAAAAAAAA
                {
                    opcode: 'iframeElementSetEffect',
                    text: formatMessage({
                        id: 'jgIframe.blocks.iframeElementSetEffect',
                        default: 'set [EFFECT] effect on iframe to [AMOUNT]',
                        description: 'YAYYAYAWOOHOOO YEEAAAAAAAAAYAYYAYAWOOHOOO YEEAAAAAAAAA'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        EFFECT: {
                            type: ArgumentType.STRING,
                            menu: 'effects',
                            defaultValue: "color"
                        },
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'iframeElementChangeEffect',
                    text: formatMessage({
                        id: 'jgIframe.blocks.iframeElementChangeEffect',
                        default: 'change [EFFECT] effect on iframe by [AMOUNT]',
                        description: 'YAYYAYAWOOHOOO YEEAAAAAAAAAYAYYAYAWOOHOOO YEEAAAAAAAAA'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        EFFECT: {
                            type: ArgumentType.STRING,
                            menu: 'effects',
                            defaultValue: "color"
                        },
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 25
                        }
                    }
                },
                {
                    opcode: 'iframeElementClearEffects',
                    text: formatMessage({
                        id: 'jgIframe.blocks.iframeElementClearEffects',
                        default: 'clear iframe effects',
                        description: 'YAYYAYAWOOHOOO YEEAAAAAAAAAYAYYAYAWOOHOOO YEEAAAAAAAAA'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'getIframeEffectAmount',
                    text: formatMessage({
                        id: 'jgIframe.blocks.getIframeEffectAmount',
                        default: 'iframe [EFFECT]',
                        description: 'YAYYAYAWOOHOOO YEEAAAAAAAAAYAYYAYAWOOHOOO YEEAAAAAAAAA'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        EFFECT: {
                            type: ArgumentType.STRING,
                            menu: 'effects',
                            defaultValue: "color"
                        }
                    }
                },
                "---"
            ],
            menus: {
                effects: EffectOptions
            }
        };
    }
    // permissions
    async IsWebsiteAllowed (url) {
        if (ProjectPermissionManager.IsDataUrl(url)) return true;
        if (!ProjectPermissionManager.IsUrlSafe(url)) return false;
        const safe = await isUrlRatedSafe(url);
        return safe;
    }

    // utilities
    GetCurrentCanvas () {
        return this.runtime.renderer.canvas;
    }
    SetNewIFrame () {
        const iframe = document.createElement("iframe");
        iframe.onload = () => {
            this.iframeLoadedValue = true;
        };
        this.createdIframe = iframe;
        return iframe;
    }
    RemoveIFrame () {
        if (this.createdIframe) {
            this.createdIframe.remove();
            this.createdIframe = null;
        }
    }
    GetIFrameState () {
        if (this.createdIframe) {
            return true;
        }
        return false;
    }
    SetIFramePosition (iframe, x, y, width, height, rotation) {
        const frame = iframe;
        const stage = {
            width: this.runtime.stageWidth,
            height: this.runtime.stageHeight
        };
        frame.style.position = "absolute"; // position above canvas without pushing it down
        frame.style.width = `${(width / stage.width) * 100}%`; // convert pixel size to percentage for full screen
        frame.style.height = `${(height / stage.height) * 100}%`;
        frame.style.transformOrigin = "center center"; // rotation and translation begins at center

        let xpos = x + (stage.width - width);
        let ypos = y - (stage.height - height);
        xpos = ((xpos / stage.width) * 100);
        ypos = (((0 - ypos) / stage.height) * 100);

        // epic maths to place x and y at the center
        frame.style.transform = `translate(${xpos}%, ${ypos}%) rotate(${rotation - 90}deg)`; 
        this.iframeSettings = {
            x: x,
            y: y,
            rotation: rotation,
            width: width,
            height: height
        };

        // when switching between project page & editor, we need to place the iframe again since it gets lost
        if (iframe.parentElement !== this.GetCurrentCanvas().parentElement) {
            /* todo: create layers so that iframe appears above 3d every time this is done */
            this.GetCurrentCanvas().parentElement.prepend(iframe);
        }
    }
    GenerateCssFilter (color, grayscale, brightness, contrast, ghost, blur, invert, saturate, sepia) {
        return `hue-rotate(${(color / 200) * 360}deg) ` + // scratch color effect goes back to normal color at 200
            `grayscale(${grayscale}%) ` +
            `brightness(${brightness + 100}%) ` + // brightness at 0 will be 100
            `contrast(${contrast + 100}%) ` + // same thing here
            `opacity(${100 - ghost}%) ` + // opacity at 0 will be 100 but opacity at 100 will be 0
            `blur(${blur}px) ` +
            `invert(${invert}%) ` + // invert is actually a percentage lolol!
            `saturate(${saturate + 100}%) ` + // saturation at 0 will be 100
            `sepia(${sepia}%)`;
    }
    ApplyFilterOptions (iframe) {
        iframe.style.filter = this.GenerateCssFilter(
            this.iframeFilters.color,
            this.iframeFilters.grayscale,
            this.iframeFilters.brightness,
            this.iframeFilters.contrast,
            this.iframeFilters.ghost,
            this.iframeFilters.blur,
            this.iframeFilters.invert,
            this.iframeFilters.saturate,
            this.iframeFilters.sepia,
        );
    }

    createIframeElement () {
        this.RemoveIFrame();
        const iframe = this.SetNewIFrame();
        iframe.style.zIndex = 500;
        iframe.style.borderWidth = "0px";
        iframe.src = "data:text/html;base64,PERPQ1RZUEUgaHRtbD4KPGh0bWwgbGFuZz0iZW4tVVMiPgo8aGVhZD48L2hlYWQ+Cjxib2R5PjxoMT5IZWxsbyE8L2gxPjxwPllvdSd2ZSBqdXN0IGNyZWF0ZWQgYW4gaWZyYW1lIGVsZW1lbnQuPGJyPlVzZSB0aGlzIHRvIGVtYmVkIHNpdGVzIHdpdGggVVJMcyBvciBIVE1MIHVzaW5nIERhdGEgVVJJcy48L3A+PC9ib2R5Pgo8L2h0bWw+";
        this.displayWebsiteUrl = iframe.src;
        // positions iframe to fit stage
        this.SetIFramePosition(iframe, 0, 0, this.runtime.stageWidth, this.runtime.stageHeight, 90); 
        this.iframeFilters = ArrayToValue(EffectOptions.items.map(item => item.value), 0); // reset all filter stuff
        this.GetCurrentCanvas().parentElement.prepend(iframe); // adds the iframe above the canvas
        return iframe;
    }
    deleteIframeElement () {
        this.RemoveIFrame();
    }
    iframeElementExists () {
        return this.GetIFrameState();
    }
    setIframeUrl (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        let usingProxy = false;
        let checkingUrl = args.URL;
        if (String(args.URL).startsWith("proxy://")) {
            // use the penguin mod proxy but still say we are on proxy:// since its what the user input
            // replace proxy:// with https:// though since we are still using the https protocol
            usingProxy = true;
            checkingUrl = String(args.URL).replace("proxy://", "https://");
        }
        this.IsWebsiteAllowed(checkingUrl).then(safe => {
            if (!safe) { // website isnt in the permitted sites list?
                this.createdIframe.src = "about:blank";
                this.displayWebsiteUrl = args.URL;
                return;
            }
            this.createdIframe.src = (usingProxy ? `https://detaproxy-1-s1965152.deta.app/?url=${String(args.URL).replace("proxy://", "https://")}` : args.URL);
            // tell the user we are on proxy:// still since it looks nicer than the disgusting deta url
            this.displayWebsiteUrl = (usingProxy ? `${String(this.createdIframe.src).replace("https://detaproxy-1-s1965152.deta.app/?url=https://", "proxy://")}` : this.createdIframe.src);
        })
    }
    setIframePosLeft (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        this.SetIFramePosition(iframe,
            args.X,
            this.iframeSettings.y,
            this.iframeSettings.width,
            this.iframeSettings.height,
            this.iframeSettings.rotation,
        );
    }
    setIframePosTop (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        this.SetIFramePosition(iframe,
            this.iframeSettings.x,
            args.Y,
            this.iframeSettings.width,
            this.iframeSettings.height,
            this.iframeSettings.rotation,
        );
    }
    setIframeSizeWidth (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        this.SetIFramePosition(iframe,
            this.iframeSettings.x,
            this.iframeSettings.y,
            args.WIDTH,
            this.iframeSettings.height,
            this.iframeSettings.rotation,
        );
    }
    setIframeSizeHeight (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        this.SetIFramePosition(iframe,
            this.iframeSettings.x,
            this.iframeSettings.y,
            this.iframeSettings.width,
            args.HEIGHT,
            this.iframeSettings.rotation,
        );
    }
    setIframeRotation (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        this.SetIFramePosition(iframe,
            this.iframeSettings.x,
            this.iframeSettings.y,
            this.iframeSettings.width,
            this.iframeSettings.height,
            args.ROTATE,
        );
    }
    showIframeElement () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        iframe.style.display = "";
    }
    hideIframeElement () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        const iframe = this.createdIframe;
        iframe.style.display = "none";
    }

    getIframeLeft () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        return this.iframeSettings.x;
    }
    getIframeTop () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        return this.iframeSettings.y;
    }
    getIframeWidth () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        return this.iframeSettings.width;
    }
    getIframeHeight () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        return this.iframeSettings.height;
    }
    getIframeRotation () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        return this.iframeSettings.rotation;
    }
    getIframeTargetUrl () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        return this.displayWebsiteUrl;
    }
    iframeElementIsHidden () {
        if (!this.GetIFrameState()) return false; // iframe doesnt exist, stop
        return this.createdIframe.style.display === "none";
    }

    whenIframeIsLoaded () {
        const value = this.iframeLoadedValue;
        this.iframeLoadedValue = false;
        return value;
    }

    // effect functions lolol
    iframeElementSetEffect (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        this.iframeFilters[args.EFFECT] = Number(args.AMOUNT);
        this.ApplyFilterOptions(this.createdIframe);
    }
    iframeElementChangeEffect (args) {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        this.iframeFilters[args.EFFECT] += Number(args.AMOUNT);
        this.ApplyFilterOptions(this.createdIframe);
    }
    iframeElementClearEffects () {
        if (!this.GetIFrameState()) return; // iframe doesnt exist, stop
        this.iframeFilters = ArrayToValue(EffectOptions.items.map(item => item.value), 0); // reset all values to 0
        this.ApplyFilterOptions(this.createdIframe);
    }
    getIframeEffectAmount (args) {
        if (!this.GetIFrameState()) return 0; // iframe doesnt exist, stop
        return this.iframeFilters[args.EFFECT];
    }
}

module.exports = JgIframeBlocks;
