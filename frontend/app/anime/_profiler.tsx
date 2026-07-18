"use client";

import { useEffect } from "react";

export default function Profiler() {
    useEffect(() => {
        const timer = setTimeout(() => {
            const metrics: Record<string, unknown> = {};

            // 1. Navigation Timing
            const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
            if (nav) {
                metrics.navigation = {
                    ttfb_ms: Math.round(nav.responseStart - nav.startTime),
                    domInteractive_ms: Math.round(nav.domInteractive - nav.startTime),
                    domContentLoaded_ms: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
                    loadComplete_ms: Math.round(nav.loadEventEnd - nav.startTime),
                    totalDuration_ms: Math.round(nav.duration),
                };
            }

            // 2. Paint Timing
            const paintEntries = performance.getEntriesByType("paint");
            const paint: Record<string, number> = {};
            paintEntries.forEach((entry) => {
                paint[entry.name] = Math.round(entry.startTime);
            });
            metrics.paint = paint;

            // 3. Long Tasks
            metrics.longTaskCount = performance.getEntriesByType("longtask").length;

            // 4. Resource summary
            const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
            const byType: Record<string, { count: number; totalKB: number; avgDuration_ms: number }> = {};
            resources.forEach((r) => {
                const type = r.initiatorType || "other";
                if (!byType[type]) byType[type] = { count: 0, totalKB: 0, avgDuration_ms: 0 };
                byType[type].count++;
                byType[type].totalKB += Math.round((r.transferSize || 0) / 1024);
                byType[type].avgDuration_ms += r.duration;
            });
            Object.values(byType).forEach((v) => {
                v.avgDuration_ms = Math.round(v.avgDuration_ms / v.count);
            });
            metrics.resources = {
                totalCount: resources.length,
                totalTransferKB: Math.round(resources.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
                byType,
            };

            // 5. DOM Stats
            const allElements = document.querySelectorAll("*");
            metrics.dom = {
                totalElements: allElements.length,
                images: document.querySelectorAll("img").length,
                divs: document.querySelectorAll("div").length,
                buttons: document.querySelectorAll("button").length,
                absolutePositioned: document.querySelectorAll('[style*="position: absolute"], [class*="absolute"]').length,
                maxDomDepth: (() => {
                    let max = 0;
                    function walk(el: Element, depth: number) {
                        if (depth > max) max = depth;
                        for (const child of Array.from(el.children)) walk(child, depth + 1);
                    }
                    walk(document.documentElement, 0);
                    return max;
                })(),
            };

            // 6. Images without sizes prop
            const imgsWithoutSizes = Array.from(document.querySelectorAll("img")).filter(
                (img) => !img.getAttribute("sizes")
            );
            metrics.imagesWithoutSizes = imgsWithoutSizes.map((img) => ({
                src: img.getAttribute("src")?.substring(0, 80),
                width: img.naturalWidth,
                height: img.naturalHeight,
            }));

            // 7. Backdrop-blur elements (GPU compositing layers)
            const blurElements = document.querySelectorAll('[class*="backdrop-blur"]');
            metrics.backdropBlurCount = blurElements.length;

            // 8. Gradient overlays
            const gradientElements = document.querySelectorAll('[class*="bg-gradient"]');
            metrics.gradientOverlayCount = gradientElements.length;

            // 9. Transition/animation elements
            const transitionElements = document.querySelectorAll('[class*="transition"]');
            metrics.transitionElementCount = transitionElements.length;

            // 10. Shadow elements
            const shadowElements = document.querySelectorAll('[class*="shadow"]');
            metrics.shadowElementCount = shadowElements.length;

            console.log("PERF_METRICS_START");
            console.log(JSON.stringify(metrics, null, 2));
            console.log("PERF_METRICS_END");

            // Also log a summary
            console.log("PERF_SUMMARY_START");
            console.log(`DOM Elements: ${metrics.dom && typeof metrics.dom === 'object' && 'totalElements' in metrics.dom ? (metrics.dom as Record<string, number>).totalElements : 'N/A'}`);
            console.log(`Images: ${metrics.dom && typeof metrics.dom === 'object' && 'images' in metrics.dom ? (metrics.dom as Record<string, number>).images : 'N/A'}`);
            console.log(`Images missing sizes: ${Array.isArray(metrics.imagesWithoutSizes) ? metrics.imagesWithoutSizes.length : 'N/A'}`);
            console.log(`Backdrop blur elements: ${metrics.backdropBlurCount}`);
            console.log(`Gradient overlays: ${metrics.gradientOverlayCount}`);
            console.log(`Transition elements: ${metrics.transitionElementCount}`);
            console.log(`Shadow elements: ${metrics.shadowElementCount}`);
            console.log(`Total resources: ${metrics.resources && typeof metrics.resources === 'object' && 'totalCount' in metrics.resources ? (metrics.resources as Record<string, number>).totalCount : 'N/A'}`);
            console.log(`Total transfer: ${metrics.resources && typeof metrics.resources === 'object' && 'totalTransferKB' in metrics.resources ? (metrics.resources as Record<string, number>).totalTransferKB : 'N/A'} KB`);
            console.log("PERF_SUMMARY_END");
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    // Render profiling: measure how many times this mounts
    useEffect(() => {
        console.log("PROFILER_MOUNT: Component mounted at", performance.now().toFixed(2), "ms");
        return () => console.log("PROFILER_UNMOUNT: Component unmounted");
    }, []);

    return null;
}
