// ==UserScript==
// @name         Slack collapse bot messages
// @description  neatly consolidate Slack bot chat messages
// @version      0.1.0
// @match        https://*.slack.com/*
// ==/UserScript==

(function() {
    'use strict';

    const botFontColor = 'silver';

    // Attach to chat view and observe mutations
    let lastChatView = null;
    const chatFinder = setInterval(() => {
        const chatView = document.querySelector('.c-virtual_list__scroll_container[role=list]');
        if (chatView === lastChatView) return; // Nothing changed
        observer.disconnect(); // Disconnect observer
        if (chatView) {
            // (Re)connect observer
            collapseBotLines(chatView);
            observer.observe(chatView, { childList: true, subtree: false });
        }
        lastChatView = chatView;
    }, 1000);

    // Collapse bot lines in mutated elements
    const observer = new MutationObserver((mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type !== 'childList') continue;
            collapseBotLines(mutation.target);
            // for (const addedNode of mutation.addedNodes) collapseBotLines(addedNode);
        }
    });

    // Collapse bot lines in container
    const collapseBotLines = (container) => {
        const chatLines = container.querySelectorAll('.c-virtual_list__item');
        for (const chatLine of chatLines) {
            if (isFromBot(chatLine)) {
                collapseLines(chatLine);
            }
        }
    };

    // Collapse this chat line
    const collapseLines = (chatLine) => {
        if (!chatLine.querySelector) return; // Probably a text node or something

        // This is the meat of the chat line
        const indent = chatLine.querySelector('.c-message_kit__indent');
        if (!indent) return; // TODO ?

        // If not already present, make expand/collapse elements:
        //
        //    <details>
        //      <summary>(one line summary)</summary>
        //      (bot content here)
        //    </details>
        let details = indent.querySelector('details');
        let summary = null;
        if (details) {
            summary = details.querySelector('summary');
        } else {
            details = document.createElement('details');
            details.style.setProperty('color', botFontColor);
            summary = document.createElement('summary');
            summary.style.setProperty('text-overflow', 'ellipsis');
            summary.style.setProperty('white-space', 'nowrap');
            summary.style.setProperty('overflow', 'hidden');
            details.appendChild(summary);
            indent.appendChild(details);
        }

        // Move bot content into details
        const hideables = [
            '.c-message__body',
            '.c-message_kit__attachments',
            '.c-message_kit__blocks',
            '.c-message_kit__broadcast_preamble',
        ];
        let replyBar = null;
        for (const chatContent of indent.children) {
            if (chatContent.matches('.c-message__reply_bar')) replyBar = chatContent;
            if (!chatContent.matches(hideables.join(', '))) continue;
            details.appendChild(chatContent);
        }

        // Move details before replyBar if found
        if (replyBar) replyBar.before(details);

        // Build summary of textContent for the summary element
        const summaryText = [];
        for (const chatContent of details.children) {
            if (!chatContent.tagName === 'SUMMARY') continue;
            summaryText.push(chatContent.textContent);
        }
        summary.innerHTML = summaryText.join(' ');
    };

    // Is chat line from a bot?
    const isFromBot = (chatLine) => {
        // Some chat lines don't have a sender tag
        // Look at previous chat lines until we find one
        for (; chatLine; chatLine = chatLine.previousElementSibling) {
            if (chatLine.querySelector('.c-message__sender')) break;
        }

        // If there's an "app" badge, it's a bot
        return chatLine && !!chatLine.querySelector('.c-app_badge');
    };
})();
