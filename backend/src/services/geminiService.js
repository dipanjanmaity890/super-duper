// ─── services/geminiService.js ─────────────────────────────────────────────
// Google Gemini 2.0 Flash — AI cricket commentary generator
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getGenAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

// ── Commentary prompt builder ────────────────────────────────────────────────
function buildPrompt(match, scorecard) {
  const scores = scorecard?.score || [];
  const inn1   = scores[0] || {};
  const inn2   = scores[1] || {};

  const battingInning = scorecard?.scorecard?.[scorecard.scorecard.length - 1];
  const batting = battingInning?.batting?.slice(0, 4) || [];
  const bowling = battingInning?.bowling?.slice(0, 2) || [];

  const batLines = batting.map(b =>
    `${b.batsman}: ${b.r}(${b.b}) [4s:${b['4s']} 6s:${b['6s']}]`
  ).join(', ');

  const bowlLines = bowling.map(b =>
    `${b.bowler}: ${b.o}ov ${b.r}r ${b.w}wkt`
  ).join(', ');

  const inn1Str = inn1.r ? `${inn1.r}/${inn1.w} (${inn1.o}ov)` : 'yet to bat';
  const inn2Str = inn2.r ? `${inn2.r}/${inn2.w} (${inn2.o}ov)` : 'yet to bat';

  return `You are an electrifying IPL cricket commentator known for energetic, insightful, and fan-friendly analysis.

Match: ${match.home_team_name} vs ${match.away_team_name}
Status: ${scorecard?.status || match.status}
Innings 1: ${match.home_team_name} — ${inn1Str}
Innings 2: ${match.away_team_name} — ${inn2Str}

Current batters: ${batLines || 'N/A'}
Current bowlers: ${bowlLines || 'N/A'}

Write a SHORT, punchy live commentary (2-3 sentences max, 80 words max). 
Be dramatic and passionate. Include:
- Current match situation
- A key observation about a batter or bowler
- The tension/excitement level
Use cricket terms naturally. End with an insight or prediction.
DO NOT use markdown. Plain text only.`;
}

// ── Main commentary generator ────────────────────────────────────────────────
async function generateCommentary(match, scorecard) {
  const model  = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = buildPrompt(match, scorecard);

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── Win probability calculator ───────────────────────────────────────────────
async function generateWinProbability(match, scorecard) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const scores = scorecard?.score || [];
  const inn1   = scores[0] || {};
  const inn2   = scores[1] || {};

  const prompt = `You are a cricket analytics AI.

Match: ${match.home_team_name} (batting first) vs ${match.away_team_name}
Innings 1: ${inn1.r}/${inn1.w} in ${inn1.o} overs
Innings 2: ${inn2.r}/${inn2.w} in ${inn2.o} overs (chasing ${(inn1.r || 0) + 1})

Respond ONLY with a JSON object, no markdown:
{"homeWinPct": <0-100>, "awayWinPct": <0-100>, "reason": "<10 words max>"}`;

  try {
    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim().replace(/```json|```/g, '');
    return JSON.parse(text);
  } catch {
    return { homeWinPct: 50, awayWinPct: 50, reason: 'Match in balance' };
  }
}

// ── Milestone celebration message ─────────────────────────────────────────────
async function generateMilestoneMessage(playerName, milestone, matchContext) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `IPL cricket commentator. Player ${playerName} just scored ${milestone}. 
Match: ${matchContext}. Write ONE electrifying celebration sentence (max 20 words). No markdown.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { generateCommentary, generateWinProbability, generateMilestoneMessage };
