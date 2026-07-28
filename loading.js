(function () {
    "use strict";

    var config = window.TORNADO_SANDBOX_CONFIG || {};
    var state = {
        totalFiles: 0,
        filesNeeded: 0,
        currentFile: "",
        receivedProgress: false,
        tipIndex: 0
    };

    var elements = {
        serverName: document.getElementById("server-name"),
        serverTagline: document.getElementById("server-tagline"),
        mapName: document.getElementById("map-name"),
        gamemodeName: document.getElementById("gamemode-name"),
        maxPlayers: document.getElementById("max-players"),
        status: document.getElementById("loading-status"),
        percentage: document.getElementById("loading-percentage"),
        progressTrack: document.getElementById("progress-track"),
        progressFill: document.getElementById("progress-fill"),
        currentFile: document.getElementById("current-file"),
        tipText: document.getElementById("tip-text")
    };

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function cleanText(value, fallback) {
        if (value === undefined || value === null || String(value).trim() === "") {
            return fallback;
        }

        return String(value).trim();
    }

    function friendlyName(value) {
        return cleanText(value, "Unknown")
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function getFileName(path) {
        var normalized = cleanText(path, "Downloading server content…").replace(/\\/g, "/");
        var parts = normalized.split("/");
        return parts[parts.length - 1] || normalized;
    }

    function setStatus(message) {
        elements.status.textContent = cleanText(message, "Loading server content…");
    }

    function setCurrentFile(message) {
        elements.currentFile.textContent = cleanText(message, "Preparing connection…");
    }

    function updateProgress() {
        if (!state.receivedProgress || state.totalFiles <= 0) {
            elements.percentage.textContent = "—";
            elements.progressFill.style.width = "26%";
            elements.progressTrack.classList.add("is-indeterminate");
            elements.progressTrack.setAttribute("aria-valuenow", "0");
            return;
        }

        var completedFiles = state.totalFiles - state.filesNeeded;
        var percentage = clamp((completedFiles / state.totalFiles) * 100, 0, 100);
        var roundedPercentage = Math.round(percentage);

        elements.progressTrack.classList.remove("is-indeterminate");
        elements.progressFill.style.width = percentage.toFixed(2) + "%";
        elements.percentage.textContent = roundedPercentage + "%";
        elements.progressTrack.setAttribute("aria-valuenow", String(roundedPercentage));
    }

    function setTip(index) {
        var tips = Array.isArray(config.tips) ? config.tips : [];
        if (tips.length === 0) {
            return;
        }

        state.tipIndex = ((index % tips.length) + tips.length) % tips.length;
        elements.tipText.classList.remove("is-visible");

        window.setTimeout(function () {
            elements.tipText.textContent = tips[state.tipIndex];
            elements.tipText.classList.add("is-visible");
        }, 180);
    }

    function readUrlFallbacks() {
        var query = new URLSearchParams(window.location.search);
        var mapName = query.get("Map") || query.get("map") || query.get("mapname");

        if (mapName && mapName.indexOf("%m") === -1) {
            elements.mapName.textContent = friendlyName(mapName);
        }
    }

    window.GameDetails = function (serverName, serverUrl, mapName, maxPlayers, steamId, gamemode, volume, language) {
        elements.serverName.textContent = cleanText(serverName, config.fallbackServerName || "Tornado Sandbox");
        elements.serverTagline.textContent = cleanText(config.tagline, "Build freely. Explore together.");
        elements.mapName.textContent = friendlyName(mapName);
        elements.gamemodeName.textContent = friendlyName(gamemode);
        elements.maxPlayers.textContent = cleanText(maxPlayers, "—");

        document.title = elements.serverName.textContent + " — Loading";
    };

    window.SetFilesTotal = function (total) {
        state.totalFiles = Math.max(0, Number(total) || 0);
        state.filesNeeded = state.totalFiles;
        state.receivedProgress = state.totalFiles > 0;
        updateProgress();
    };

    window.SetFilesNeeded = function (needed) {
        state.filesNeeded = clamp(Number(needed) || 0, 0, Math.max(0, state.totalFiles));
        state.receivedProgress = state.totalFiles > 0;
        updateProgress();
    };

    window.DownloadingFile = function (fileName) {
        state.currentFile = cleanText(fileName, "");
        setCurrentFile("Downloading: " + getFileName(state.currentFile));
    };

    window.SetStatusChanged = function (status) {
        setStatus(status);

        if (/sending client info|client info sent|starting lua|fully connected/i.test(cleanText(status, ""))) {
            setCurrentFile("Finalising your connection…");
        }
    };

    function startTipRotation() {
        setTip(0);

        window.setInterval(function () {
            setTip(state.tipIndex + 1);
        }, Math.max(2500, Number(config.tipIntervalMs) || 6500));
    }

    function runPreviewMode() {
        var query = new URLSearchParams(window.location.search);
        if (query.get("preview") !== "1") {
            return;
        }

        window.GameDetails(
            "Tornado Sandbox",
            window.location.href,
            query.get("Map") || "gm_construct",
            32,
            "76561198000000000",
            "sandbox",
            1,
            "en"
        );

        window.SetFilesTotal(120);
        var remaining = 120;
        var previewFiles = [
            "materials/tornado_sandbox/storm_clouds.vmt",
            "models/props_c17/furniturechair001a.mdl",
            "sound/tornado_sandbox/ambience/wind.ogg",
            "lua/autorun/client/tornado_hud.lua"
        ];

        window.setInterval(function () {
            remaining = Math.max(0, remaining - 1);
            window.SetFilesNeeded(remaining);
            window.DownloadingFile(previewFiles[remaining % previewFiles.length]);

            if (remaining === 0) {
                window.SetStatusChanged("Sending client info…");
            }
        }, 90);
    }

    elements.serverName.textContent = config.fallbackServerName || "Tornado Sandbox";
    elements.serverTagline.textContent = config.tagline || "Build freely. Explore together.";
    elements.tipText.classList.add("is-visible");

    readUrlFallbacks();
    updateProgress();
    startTipRotation();
    runPreviewMode();
})();
