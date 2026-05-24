const jsonfile = require('jsonfile');
const moment   = require('moment');
const simpleGit = require('simple-git');
const fs   = require('fs');
const path = require('path');

const git          = simpleGit();
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

const sortedDates = [...committedDates].sort();

// Walk the full timeline from account creation.
// Find the first gap that is too large and return the next date to fill.
const findNextDate = () => {
    let cursor = ACCOUNT_START.clone();

    for (const dateStr of sortedDates) {
        const commitMoment = moment(dateStr);
        const gapDays = commitMoment.diff(cursor, 'days');

        if (gapDays > MAX_GAP) {
            // Gap too big — need a commit between cursor and this date
            const gap  = Math.floor(Math.random() * (MAX_GAP - MIN_GAP + 1)) + MIN_GAP;
            const next = cursor.clone().add(gap, 'days');
            // Make sure it doesn't land on an already committed date
            if (!committedDates.includes(next.format('YYYY-MM-DD'))) {
                return next;
            }
        }
        // Move cursor forward to this committed date
        cursor = commitMoment.clone();
    }

    // All existing commits are well-spaced; extend forward from the last one
    const gap  = Math.floor(Math.random() * (MAX_GAP - MIN_GAP + 1)) + MIN_GAP;
    return cursor.clone().add(gap, 'days');
};

const nextDate = findNextDate();
const nextStr  = nextDate.format('YYYY-MM-DD');

const commitOnDate = async (dateStr) => {
    const nCommits = Math.floor(Math.random() * 2) + 1;
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
    if (nextDate.isAfter(today)) {
        console.log(`Graph is up to date. Next date ${nextStr} is in the future.`);
        return;
    }
    if (nextDate.isBefore(ACCOUNT_START)) {
        console.log(`Skipping — date before account creation.`);
        return;
    }

    console.log(`Committing ${nextStr}`);
    await commitOnDate(nextStr);

    await git.add(TRACKER_PATH);
    await git.commit('bot: update committed_dates tracker');
    await git.push();
    console.log(`Done.`);
};

run();