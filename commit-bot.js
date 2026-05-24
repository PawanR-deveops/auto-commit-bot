const jsonfile = require('jsonfile');
const moment = require('moment');
const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const git = simpleGit();
const FILE_PATH    = path.join(__dirname, 'data.json');
const TRACKER_PATH = path.join(__dirname, 'committed_dates.json');

const ACCOUNT_START = moment('2024-08-26', 'YYYY-MM-DD').startOf('day');
const today         = moment().startOf('day');
const MIN_GAP = 3;
const MAX_GAP = 16;

let committedDates = [];
if (fs.existsSync(TRACKER_PATH)) {
    committedDates = jsonfile.readFileSync(TRACKER_PATH);
}

// Find the last committed date; if none, start just before account creation
const sortedDates = [...committedDates].sort();
const lastDate = sortedDates.length > 0
    ? moment(sortedDates[sortedDates.length - 1])
    : ACCOUNT_START.clone().subtract(1, 'day');

// Next commit = last date + random gap (3–16 days)
const gap      = Math.floor(Math.random() * (MAX_GAP - MIN_GAP + 1)) + MIN_GAP;
const nextDate = lastDate.clone().add(gap, 'days');
const nextStr  = nextDate.format('YYYY-MM-DD');

const commitOnDate = async (dateStr) => {
    const nCommits = Math.floor(Math.random() * 2) + 1; // 1 or 2 commits
    for (let i = 0; i < nCommits; i++) {
        const dateTime = moment(dateStr)
            .hour(Math.floor(Math.random() * 10) + 9)
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
    // Out of range — future date or before account creation
    if (nextDate.isAfter(today) || nextDate.isBefore(ACCOUNT_START)) {
        console.log(`Next date ${nextStr} is out of range (today: ${today.format('YYYY-MM-DD')}). Skipping.`);
        return;
    }

    if (committedDates.includes(nextStr)) {
        console.log(`${nextStr} already committed. Skipping.`);
        return;
    }

    console.log(`Committing ${nextStr} (gap: ${gap} days from ${lastDate.format('YYYY-MM-DD')})`);
    await commitOnDate(nextStr);

    await git.add(TRACKER_PATH);
    await git.commit('bot: update committed_dates tracker');
    await git.push();
    console.log(`Done. Next run will pick ${MIN_GAP}–${MAX_GAP} days after ${nextStr}.`);
};

run();