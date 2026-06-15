// ==UserScript==
// @name         UOOC_优课刷课_sztu软件工程
// @namespace    https://www.sztu.edu.cn/
// @version      2.3.0
// @license      MPL
// @description  自动播放未完成视频，跳过章节测试
// @author       somebody in SZTU
// @include      *
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    "use strict";

    if (!location.hostname.includes("uooc.net.cn")) return;
    if (!location.pathname.startsWith("/home/learn")) return;

    console.log("UOOC v2.3.0");

    const SPEED = 2;
    const MUTE = true;
    const PROGRESS_KEY = 'uooc_progress';

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function getUnfinished() {
        let out = [];
        document.querySelectorAll(".level_2_resourcelist_item").forEach(item => {
            try {
                let s = angular.element(item).scope();
                if (!s || !s.source) return;
                if (s.source.type != 10) return;
                if (s.source.finished == 1) return;
                out.push(item);
            } catch (e) {}
        });
        return out;
    }

    async function waitPlayer() {
        for (let i = 0; i < 20; i++) {
            let v = document.getElementById("player_html5_api");
            if (v && v.readyState > 0) return v;
            await sleep(1000);
        }
        return null;
    }

    async function playOne(video) {
        video.muted = MUTE;
        video.playbackRate = SPEED;
        let btn = document.querySelector(".vjs-big-play-button");
        if (btn && video.paused) btn.click();
        return new Promise(r => {
            let last = -1, n = 0;
            let id = setInterval(() => {
                if (video.ended) { clearInterval(id); r(1); return; }
                if (video.currentTime === last && last > 0) { n++; if (n > 15) { clearInterval(id); r(0); } }
                else n = 0;
                last = video.currentTime;
            }, 2000);
        });
    }

    function hasXiangxia(el) {
        let img = el.querySelector('img');
        return img && img.src && img.src.includes('xiangxia');
    }

    function saveProgress(href) {
        try { localStorage.setItem(PROGRESS_KEY, href); } catch (e) {}
    }

    function loadProgress() {
        try { return localStorage.getItem(PROGRESS_KEY); } catch (e) { return null; }
    }

    function clearProgress() {
        try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
    }

    function getCurrentSectionRef() {
        let hash = location.hash.replace('#', '');
        let parts = hash.split('/');
        if (parts.length >= 4) {
            // Returns chapterId/sectionId format
            return '#/' + parts[1] + '/' + parts[2] + '/' + parts[3];
        }
        return null;
    }

    async function playVideoItem(v) {
        console.log("🎬", v.innerText.trim());
        v.click();
        await sleep(2000);
        let vid = await waitPlayer();
        if (!vid) return;
        await playOne(vid);
        console.log("✅");
        await sleep(1500);
    }

    async function main() {
        await sleep(3000);

        // Phase 1: play any unfinished video on the current page immediately
        let firstBatch = getUnfinished();
        if (firstBatch.length > 0) {
            console.log("当前页有未完成视频，先播放");
            for (let v of firstBatch) {
                await playVideoItem(v);
            }
        }

        // Phase 2: traverse remaining sections
        let chapters = [...document.querySelectorAll('.level_1_title')];
        console.log("共", chapters.length, "章");

        // Check if we have saved progress to resume from
        let skipTo = loadProgress();
        let currentRef = getCurrentSectionRef();
        // If on a specific section page, skip to that section
        if (!skipTo && currentRef) {
            skipTo = currentRef;
        }

        for (let chapter of chapters) {
            let chHref = chapter.getAttribute('href') || '';

            if (hasXiangxia(chapter)) {
                chapter.click();
                await sleep(2000);
            }

            let sections = [...document.querySelectorAll('.level_2_title')];
            if (sections.length === 0) continue;

            let skipping = !!skipTo;

            for (let section of sections) {
                let secHref = section.getAttribute('href') || '';

                // Skip to saved/resumed position
                if (skipping) {
                    if (secHref === skipTo) {
                        skipping = false;
                    } else {
                        continue;
                    }
                }

                if (hasXiangxia(section)) {
                    section.click();
                    await sleep(2000);
                }

                let videos = getUnfinished();
                if (videos.length === 0) continue;

                for (let v of videos) {
                    await playVideoItem(v);
                }

                saveProgress(secHref);
            }
        }

        clearProgress();
        console.log("全部完成，刷新...");
        location.reload();
    }

    setTimeout(() => { main().catch(console.error); }, 2000);
})();
