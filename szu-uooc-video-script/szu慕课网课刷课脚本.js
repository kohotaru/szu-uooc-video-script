// ==UserScript==
// @name         UOOC_优课刷课_sztu软件工程
// @namespace    https://www.sztu.edu.cn/
// @version      2.2.0
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

    console.log("UOOC v2.2.0");

    const SPEED = 2;
    const MUTE = true;

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
        for (let i = 0; i < 30; i++) {
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

    async function main() {
        await sleep(5000);

        let chapters = [...document.querySelectorAll('.level_1_title')];
        console.log("共", chapters.length, "章");

        for (let i = 0; i < chapters.length; i++) {
            let chapter = chapters[i];
            if (hasXiangxia(chapter)) {
                chapter.click();
                await sleep(3000);
            }

            let sections = [...document.querySelectorAll('.level_2_title')];
            if (sections.length === 0) continue;

            for (let section of sections) {
                if (hasXiangxia(section)) {
                    section.click();
                    await sleep(3000);
                }

                let videos = getUnfinished();
                if (videos.length === 0) continue;

                for (let v of videos) {
                    console.log("🎬", v.innerText.trim());
                    v.click();
                    await sleep(3000);
                    let vid = await waitPlayer();
                    if (!vid) continue;
                    await playOne(vid);
                    console.log("✅");
                    await sleep(2000);
                }
            }
        }

        console.log("刷新...");
        location.reload();
    }

    setTimeout(() => { main().catch(console.error); }, 2000);
})();
