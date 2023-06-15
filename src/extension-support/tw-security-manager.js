/* eslint-disable no-unused-vars */

// a lot of this is pasted from turbowarp scratch-gui

/**
 * @param {string} url Original URL string
 * @returns {URL|null} A URL object if it is valid and of a known protocol, otherwise null.
 */
const parseURL = url => {
    let parsed;
    try {
        parsed = new URL(url);
    } catch (e) {
        return null;
    }
    const protocols = ['http:', 'https:', 'ws:', 'wss:', 'data:', 'blob:'];
    if (!protocols.includes(parsed.protocol)) {
        return null;
    }
    return parsed;
};
/**
 * 
 * Trusted extensions are loaded automatically and without a sandbox.
 * @param {string} url URL as a string.
 * @returns {boolean} True if the extension can is trusted
 */
const isTrustedExtension = url => (
    url.startsWith('https://extensions.turbowarp.org/') ||
    url.startsWith('http://localhost:8000/')
);

/**
 * @param {URL} parsed Parsed URL object
 * @returns {boolean} True if the URL is part of the builtin set of URLs to always trust fetching from.
 */
const isAlwaysTrustedForFetching = parsed => (
    // Note that the regexes here don't need to be perfect. It's okay if we let extensions try to fetch
    // resources from eg. GitHub Pages domains that aren't actually valid usernames. They'll just get
    // a network error.
    // URL parsing will always convert the parsed origin to lowercase, so we don't need case
    // insensitivity here.

    // If we would trust loading an extension from here, we can trust loading resources too.
    isTrustedExtension(parsed.href) ||

    // Any TurboWarp service such as trampoline
    parsed.origin === 'https://turbowarp.org' ||
    parsed.origin.endsWith('.turbowarp.org') ||
    parsed.origin.endsWith('.turbowarp.xyz') ||

    // GitHub
    parsed.origin === 'https://raw.githubusercontent.com' ||
    parsed.origin === 'https://api.github.com' ||
    parsed.origin.endsWith('.github.io') ||

    // GitLab
    parsed.origin === 'https://gitlab.com' ||
    parsed.origin.endsWith('.gitlab.io') ||

    // BitBucket
    parsed.origin.endsWith('.bitbucket.io') ||

    // Itch
    parsed.origin.endsWith('.itch.io') ||

    // GameJolt
    parsed.origin === 'https://api.gamejolt.com' ||

    // httpbin
    parsed.origin === 'https://httpbin.org' ||

    // ScratchDB
    parsed.origin === 'https://scratchdb.lefty.one'
);

/**
 * Responsible for determining various policies related to custom extension security.
 * The default implementation restricts automatic extension loading, but grants any
 * loaded extensions the maximum possible capabilities so as to retain compatibility
 * with a vanilla scratch-vm. You may override properties of an instance of this class
 * to customize the security policies as you see fit, for example:
 * ```js
 * vm.securityManager.getSandboxMode = (url) => {
 *   if (url.startsWith("https://example.com/")) {
 *     return "unsandboxed";
 *   }
 *   return "iframe";
 * };
 * vm.securityManager.canAutomaticallyLoadExtension = (url) => {
 *   return confirm("Automatically load extension: " + url);
 * };
 * vm.securityManager.canFetch = (url) => {
 *   return url.startsWith('https://turbowarp.org/');
 * };
 * vm.securityManager.canOpenWindow = (url) => {
 *   return url.startsWith('https://turbowarp.org/');
 * };
 * vm.securityManager.canRedirect = (url) => {
 *   return url.startsWith('https://turbowarp.org/');
 * };
 * ```
 */
const fetchOriginsTrustedByUser = new Set();
class SecurityManager {
    /**
     * Determine the typeof sandbox to use for a certain custom extension.
     * @param {string} extensionURL The URL of the custom extension.
     * @returns {'worker'|'iframe'|'unsandboxed'|Promise<'worker'|'iframe'|'unsandboxed'>}
     */
    getSandboxMode(extensionURL) {
        return isTrustedExtension(extensionURL)
            ? Promise.resolve('unsandboxed') : Promise.resolve('iframe');
    }

    /**
     * Determine whether a custom extension that was stored inside a project may be
     * loaded. You could, for example, ask the user to confirm loading an extension
     * before resolving.
     * @param {string} extensionURL The URL of the custom extension.
     * @returns {Promise<boolean>|boolean}
     */
    canLoadExtensionFromProject(extensionURL) {
        if (isTrustedExtension(extensionURL)) {
            return true;
        }
        /* eslint-disable max-len */
        return confirm(`The project wants to load a custom extension from the URL:
${extensionURL}
While the code will be sandboxed, it will still have access to information about your device such as your IP and general location. Make sure you trust the author of this extension before continuing.
Allow this?`);
        /* eslint-enable max-len */
    }

    /**
     * Determine whether an extension is allowed to fetch a remote resource URL.
     * This only applies to unsandboxed extensions that use the appropriate Scratch.* APIs.
     * Sandboxed extensions ignore this entirely as there is no way to force them to use our APIs.
     * data: and blob: URLs are always allowed (this method is never called).
     * @param {string} resourceURL
     * @returns {Promise<boolean>|boolean}
     */
    canFetch(resourceURL) {
        return true;
        /*
        const parsed = parseURL(resourceURL);
        if (!parsed) {
            return false;
        }
        if (isAlwaysTrustedForFetching(parsed)) {
            return true;
        }
        if (fetchOriginsTrustedByUser.has(origin)) {
            return true;
        }
        const allowed = confirm(`The project wants to connect to the website:
${resourceURL}
This could be used to download images or sounds, implement multiplayer, access an API, or for` +
    `malicious purposes. This will share your IP address, general location, and possibly other data with the website.
If allowed, further requests to the same website will be automatically allowed.
Allow this?`);
        if (allowed) {
            fetchOriginsTrustedByUser.add(origin);
        }
        return allowed;
        */
    }

    /**
     * Determine whether an extension is allowed to open a new window or tab to a given URL.
     * This only applies to unsandboxed extensions. Sandboxed extensions are unable to open windows.
     * javascript: URLs are always rejected (this method is never called).
     * @param {string} websiteURL
     * @returns {Promise<boolean>|boolean}
     */
    canOpenWindow(websiteURL) {
        const parsed = parseURL(websiteURL);
        if (!parsed) {
            return false;
        }
        return confirm(`The project wants to open a new window or tab with the URL:
${websiteURL}
This website has not been reviewed by the Codebase developers. It may contain dangerous or malicious code.
Allow this?`);
    }

    /**
     * Determine whether an extension is allowed to redirect the current tab to a given URL.
     * This only applies to unsandboxed extensions. Sandboxed extensions are unable to redirect the parent
     * window, but are free to redirect their own sandboxed window.
     * javascript: URLs are always rejected (this method is never called).
     * @param {string} websiteURL
     * @returns {Promise<boolean>|boolean}
     */
    canRedirect(websiteURL) {
        const parsed = parseURL(websiteURL);
        if (!parsed) {
            return false;
        }
        return confirm(`The project wants to navigate this tab to the URL:
${websiteURL}
This website has not been reviewed by the Codebase developers. It may contain dangerous or malicious code.
Allow this?`);
    }

    /**
     * Determine whether an extension is allowed to record audio from the user's microphone.
     * This could include raw audio data or a transcriptions.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean}
     */
    canRecordAudio() {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to record video from the user's camera.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean}
     */
    canRecordVideo() {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to read values from the user's clipboard
     * without user interaction.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean}
     */
    canReadClipboard() {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to show notifications.
     * Note that, even if this returns true, success is not guaranteed.
     * @returns {Promise<boolean>|boolean}
     */
    canNotify() {
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to fetch a remote resource URL.
     * This only applies to unsandboxed extensions that use the appropriate Scratch.* APIs.
     * Sandboxed extensions ignore this entirely as there is no way to force them to use our APIs.
     * data: and blob: URLs are always allowed (this method is never called).
     * @param {string} resourceURL
     * @returns {Promise<boolean>|boolean}
     */
    canFetch (resourceURL) {
        // By default, allow any requests.
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to open a new window or tab to a given URL.
     * This only applies to unsandboxed extensions. Sandboxed extensions are unable to open windows.
     * javascript: URLs are always rejected (this method is never called).
     * @param {string} websiteURL
     * @returns {Promise<boolean>|boolean}
     */
    canOpenWindow (websiteURL) {
        // By default, allow all.
        return Promise.resolve(true);
    }

    /**
     * Determine whether an extension is allowed to redirect the current tab to a given URL.
     * This only applies to unsandboxed extensions. Sandboxed extensions are unable to redirect the parent
     * window, but are free to redirect their own sandboxed window.
     * javascript: URLs are always rejected (this method is never called).
     * @param {string} websiteURL
     * @returns {Promise<boolean>|boolean}
     */
    canRedirect (websiteURL) {
        // By default, allow all.
        return Promise.resolve(true);
    }
}

module.exports = SecurityManager;
