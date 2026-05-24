const jsonfile = require('jsonfile');
const moment = require('moment');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const git = simpleGit();
const FILE_PATH = path.join(__dirname, 'data.json');
const TRACKER_PATH = path.join(__dirname, 'committed_dates.json');

// Account creation date — never commit before this
const ACCOUNT_START = moment('2024-08-26', 'YYYY-MM-DD').startOf('day');

let committedDates = [];
if (fs.existsSync(TRACKER_PATH)) {
    committedDates = jsonfile.readFileSync(TRACKER_PATH);
}

// Build date range: account creation → today
const today = moment().startOf('day');
const cursor = ACCOUNT_START.clone();
const allDates = [];

while (cursor.isSameOrBefore(today)) {
    const dateStr = cursor.format('YYYY-MM-DD');
    if (!committedDates.includes(dateStr)) {
        allDates.push(dateStr);
    }
    cursor.add(1, 'day');
}

// Only pick dates not adjacent to already-committed dates
const isAdjacent = (dateStr) => {
    const d = moment(dateStr);
    const prev = d.clone().subtract(1, 'day').format('YYYY-MM-DD');
    const next = d.clone().add(1, 'day').format('YYYY-MM-DD');
    return committedDates.includes(prev) || committedDates.includes(next);
};

const available = allDates.filter(d => !isAdjacent(d));
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const selected = shuffle(available).slice(0, Math.floor(Math.random() * 2) + 2); // 2 or 3 dates

const commitOnDate = async (dateStr) => {
    const nCommits = Math.floor(Math.random() * 2) + 1; // 1–2 commits
    for (let i = 0; i < nCommits; i++) {
        const dateTime = moment(dateStr)
            .hour(Math.floor(Math.random() * 12) + 8)
            .minute(Math.floor(Math.random() * 60))
            .second(Math.floor(Math.random() * 60))
            .format();

        fs.writeFileSync(FILE_PATH, JSON.stringify({ date: dateTime }));
        await git.add(FILE_PATH);
        await git.commit(`Commit for ${dateStr}`, { '--date': dateTime });
        console.log(`Committed: ${dateTime}`);
    }
    committedDates.push(dateStr);
    jsonfile.writeFileSync(TRACKER_PATH, committedDates);
};

const run = async () => {
    if (selected.length === 0) {
        console.log('All dates from account creation to today are covered!');
        return;
    }

    for (const dateStr of selected) {
        await commitOnDate(dateStr);
    }

    // Save tracker back to repo so next run knows what was done
    await git.add(TRACKER_PATH);
    await git.commit('bot: update committed_dates tracker');

    await git.push();
    console.log(`Done! Pushed ${selected.length} backdated entries.`);
};

run();