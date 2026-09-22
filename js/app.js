import { ACHIEVEMENTS, APP_VERSION, AVATARS } from './core/data.js';
import { ArcadeStorage } from './core/storage.js';
import { ArcadeAudio } from './core/audio.js';
import { evaluateAchievements } from './core/achievements.js';
import { DIFFICULTIES, normalizeGameOptions } from './core/bubble-rules.js';
import { GameHost } from './core/game-host.js';
import { BubbleBlastDuo } from './games/bubble-blast-duo.js';

const $ = selector => document.querySelector(selector); const $$ = selector => [...document.querySelectorAll(selector)];
const storage = new ArcadeStorage(); let data = storage.load(); const session = { rounds: 0, pops: 0, secondsPlayed: 0 };
const audio = new ArcadeAudio(() => data.settings.sound, () => data.settings.music); const host = new GameHost();
let lastGameConfig = { mode: 'coop', format: 'classic', difficulty: 'classic' }; let deferredInstall = null; let pendingWorker = null; let toastTimer = 0; let gameStartedAt = 0; let orientationPaused = false;

function avatarIndex(id) { return Math.max(0, AVATARS.findIndex(avatar => avatar.id === id)); }
function avatarClass(id) { return `avatar-${avatarIndex(id)}`; }
function escapeText(text) { const node = document.createElement('span'); node.textContent = text; return node.innerHTML; }
function safeClose(dialog) { if (dialog?.open) dialog.close(); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600); }
function openDialog(dialog) { if (!dialog.open) dialog.showModal(); }

function applySettings() {
  document.body.classList.toggle('reduced-motion', data.settings.reducedMotion); document.body.classList.toggle('high-contrast', data.settings.highContrast); document.body.classList.toggle('large-controls', data.settings.largeControls);
  $('#soundSetting').checked = data.settings.sound; $('#musicSetting').checked = data.settings.music; $('#hapticsSetting').checked = data.settings.haptics;
  $('#motionSetting').checked = data.settings.reducedMotion; $('#contrastSetting').checked = data.settings.highContrast; $('#largeSetting').checked = data.settings.largeControls;
}

function renderProfiles() {
  data.profiles.forEach((profile, index) => {
    $$(`[data-profile-name="${index}"]`).forEach(node => { node.textContent = profile.name; }); $$(`[data-profile-avatar="${index}"]`).forEach(node => { node.className = `profile-avatar ${avatarClass(profile.avatar)}`; });
    const card = $(`.profile-card[data-profile="${index}"]`); card.classList.toggle('is-active', data.activeProfile === index); card.setAttribute('aria-pressed', String(data.activeProfile === index));
  });
  const active = data.profiles[data.activeProfile]; $('#topPlayerName').textContent = active.name; $('#topAvatar').className = `tiny-avatar ${avatarClass(active.avatar)}`;
}

function renderStats() {
  $('#statsGrid').innerHTML = data.profiles.map((profile, index) => {
    const attempts = profile.stats.pops + profile.stats.misses; const accuracy = attempts ? Math.round(profile.stats.pops / attempts * 100) : 0; const game = profile.stats.bubbleBlast; const medals = game.medals.gold + game.medals.silver + game.medals.bronze;
    return `<article class="stat-player-card"><div class="stat-player-head"><span class="profile-avatar ${avatarClass(profile.avatar)}" aria-hidden="true"></span><div><h3>${escapeText(profile.name)}</h3><span>Player ${index + 1}</span></div></div><div class="stat-numbers"><div class="stat-number"><strong>${profile.stats.highScore}</strong><span>High score</span></div><div class="stat-number"><strong>${profile.stats.pops}</strong><span>Bubbles</span></div><div class="stat-number"><strong>${profile.stats.bestCombo}×</strong><span>Best combo</span></div><div class="stat-number"><strong>${accuracy}%</strong><span>Accuracy</span></div><div class="stat-number"><strong>${game.powerUps}</strong><span>Power-ups</span></div><div class="stat-number"><strong>${medals}</strong><span>Medals</span></div></div><div class="game-stat-ribbon"><span>Bubble Blast</span><b>${game.games} matches · ${game.tournamentWins} cup wins · ${game.medals.gold} gold</b></div></article>`;
  }).join('');
  const sessionMinutes = Math.max(0, Math.round(session.secondsPlayed / 60)); $('#sessionStats').innerHTML = `<div class="session-stat"><strong>${session.rounds}</strong><span>Rounds</span></div><div class="session-stat"><strong>${session.pops}</strong><span>Pops</span></div><div class="session-stat"><strong>${sessionMinutes}m</strong><span>Play time</span></div>`;
}

function renderTrophies() {
  const unlockedCount = ACHIEVEMENTS.filter(a => data.shared.achievements[a.id]).length; $('#trophyCount').textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`; $('#trophyProgress').style.width = `${unlockedCount / ACHIEVEMENTS.length * 100}%`;
  $('#trophyGrid').innerHTML = ACHIEVEMENTS.map(achievement => { const unlockedAt = data.shared.achievements[achievement.id]; const date = unlockedAt ? new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return `<article class="trophy-card ${unlockedAt ? '' : 'is-locked'}"><div class="trophy-icon" aria-hidden="true">${achievement.icon}</div><h3>${achievement.title}</h3><p>${achievement.text}</p><span class="trophy-date">${unlockedAt ? `Unlocked ${date}` : 'Still sparkling in the distance'}</span></article>`; }).join('');
}

function renderAll() { renderProfiles(); renderStats(); renderTrophies(); applySettings(); }
function showView(name, updateHistory = true) {
  const valid = ['home','stats','trophies','settings']; if (!valid.includes(name)) name = 'home'; $$('[data-view-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.viewPanel === name));
  $$('.nav-button').forEach(button => { const active = button.dataset.view === name; button.classList.toggle('is-active', active); button.setAttribute('aria-current', active ? 'page' : 'false'); });
  window.scrollTo({ top: 0, behavior: data.settings.reducedMotion ? 'auto' : 'smooth' }); if (name === 'stats') renderStats(); if (name === 'trophies') renderTrophies(); const nextHash = `#${name}`; if (updateHistory && location.hash !== nextHash) history.pushState({ view: name }, '', nextHash);
}
function showInfo({ title, text, eyebrow = 'Coming soon', icon = '✦' }) { $('#infoTitle').textContent = title; $('#infoText').textContent = text; $('#infoEyebrow').textContent = eyebrow; $('#infoIcon').textContent = icon; openDialog($('#infoDialog')); }

function openProfiles() {
  $('#profileEditors').innerHTML = data.profiles.map((profile, index) => `<section class="profile-editor"><label for="playerName${index}">Player ${index + 1} name</label><input id="playerName${index}" name="playerName${index}" type="text" maxlength="18" autocomplete="off" value="${escapeText(profile.name)}"><div class="avatar-options" role="radiogroup" aria-label="Player ${index + 1} avatar">${AVATARS.map(avatar => `<label class="avatar-option" title="${avatar.label}"><input type="radio" name="avatar${index}" value="${avatar.id}" ${profile.avatar === avatar.id ? 'checked' : ''}><i class="${avatar.className}" aria-hidden="true"></i><span class="visually-hidden">${avatar.label}</span></label>`).join('')}</div></section>`).join(''); openDialog($('#profileDialog')); setTimeout(() => $('#playerName0')?.focus(), 100);
}
function saveProfiles(event) { event.preventDefault(); data.profiles.forEach((profile, index) => { const name = $(`#playerName${index}`).value.trim(); const avatar = $(`input[name="avatar${index}"]:checked`)?.value; profile.name = name.slice(0, 18) || `Player ${index + 1}`; if (AVATARS.some(item => item.id === avatar)) profile.avatar = avatar; }); storage.save(); safeClose($('#profileDialog')); renderAll(); audio.click(); showToast('Players saved ✨'); }
function setActivePlayer(index) { data.activeProfile = Number(index) === 1 ? 1 : 0; storage.save(); renderProfiles(); audio.click(); showToast(`${data.profiles[data.activeProfile].name} is ready`); }
function openModeDialog() { audio.ensure(true); openDialog($('#modeDialog')); }

function updateGameScore({ scores, multipliers }) {
  $('#gameP1Score').textContent = scores[0]; $('#gameP2Score').textContent = scores[1]; $('#gameP1Multiplier').textContent = `×${multipliers[0]}`; $('#gameP2Multiplier').textContent = `×${multipliers[1]}`;
  $('#gameP1Multiplier').classList.toggle('is-hot', multipliers[0] > 1); $('#gameP2Multiplier').classList.toggle('is-hot', multipliers[1] > 1);
}
function updateGamePhase(phase) {
  $('#roundLabel').textContent = lastGameConfig.format === 'tournament' ? `ROUND ${phase.round || 1}/${phase.rounds || 3}` : '60s CLASSIC';
  $('#countdownDisplay').hidden = !phase.visible; if (!phase.visible) return; $('#countdownKicker').textContent = phase.kicker || 'GET READY'; $('#countdownValue').textContent = phase.value || ''; $('#countdownHint').textContent = phase.hint || '';
}
function updateTeamTarget(target) { $('#teamTarget').hidden = !target.visible; if (!target.visible) return; $('#teamTargetLabel').textContent = `TEAM GOAL · ${target.current} / ${target.target}${target.rewards ? ` · ${target.rewards} REWARD${target.rewards === 1 ? '' : 'S'}` : ''}`; $('#teamTargetProgress').style.width = `${Math.min(100, target.current / target.target * 100)}%`; }
function updatePower({ lane, label, seconds }) {
  const nodes = lane < 0 ? [$('#powerP1'), $('#powerP2')] : [lane ? $('#powerP2') : $('#powerP1')];
  for (const node of nodes) { node.hidden = !label; node.textContent = label ? `${label}${seconds > 2 ? ` · ${seconds}s` : ''}` : ''; }
}

host.register('bubble-blast-duo', () => new BubbleBlastDuo({
  canvas: $('#gameCanvas'), audio, hapticsEnabled: () => data.settings.haptics, reducedMotion: () => data.settings.reducedMotion,
  onScore: updateGameScore, onTime: time => { $('#gameTimer').textContent = time; }, onPhase: updateGamePhase, onTeamTarget: updateTeamTarget, onPower: updatePower,
  onRound: result => { $('#roundLabel').textContent = `ROUND ${result.number}/${lastGameConfig.format === 'tournament' ? 3 : 1}`; }, onComplete: completeMatch
}));

async function startGame(config = lastGameConfig, pushHistory = true) {
  lastGameConfig = normalizeGameOptions(config); lastGameConfig = { mode: lastGameConfig.mode, format: lastGameConfig.format, difficulty: lastGameConfig.difficulty }; safeClose($('#modeDialog')); safeClose($('#resultDialog'));
  $('#arcadeShell').hidden = true; $('#gameScreen').hidden = false; $('#pauseCard').hidden = true; $('#rotateCard').hidden = true; $('#countdownDisplay').hidden = false; orientationPaused = false;
  const solo = lastGameConfig.mode === 'solo'; const soloProfile = data.profiles[data.activeProfile]; $('#gameP1Name').textContent = solo ? soloProfile.name : data.profiles[0].name; $('#gameP2Name').textContent = data.profiles[1].name; $('#gameP2Hud').hidden = solo;
  $('#gameModeBadge').textContent = `${lastGameConfig.mode === 'coop' ? 'CO-OP' : lastGameConfig.mode.toUpperCase()} · ${lastGameConfig.format === 'tournament' ? '3-ROUND CUP' : 'CLASSIC'}`; $('#difficultyLabel').textContent = DIFFICULTIES[lastGameConfig.difficulty].label.toUpperCase();
  gameStartedAt = Date.now(); audio.ensure(true); host.launch('bubble-blast-duo', { ...lastGameConfig, soloPlayer: data.activeProfile }); if (pushHistory && location.hash !== '#game') history.pushState({ game: true }, '', '#game');
  try { if (matchMedia('(display-mode: standalone)').matches) await screen.orientation?.lock?.('landscape'); } catch (_) { /* Rotation guidance remains available when lock is denied. */ }
  handleOrientation();
}

function gameConfigFromForm() { const form = new FormData($('#gameSetupForm')); return { mode: form.get('gameMode'), format: form.get('gameFormat'), difficulty: form.get('gameDifficulty') }; }
function pauseGame() { if (!host.active || host.active.paused || !$('#rotateCard').hidden) return; host.pause('player'); $('#pauseCard').hidden = false; }
function resumeGame() { host.resume(); $('#pauseCard').hidden = true; audio.click(); }
function retryGame() { $('#pauseCard').hidden = true; host.exit(); startGame(lastGameConfig, false); }
function exitGame(skipHistory = false) {
  host.exit(); $('#gameScreen').hidden = true; $('#pauseCard').hidden = true; $('#rotateCard').hidden = true; $('#countdownDisplay').hidden = true; $('#arcadeShell').hidden = false; orientationPaused = false;
  try { screen.orientation?.unlock?.(); } catch (_) { /* Not supported in every browser. */ }
  showView('home', false); if (!skipHistory && location.hash === '#game') history.replaceState({ view: 'home' }, '', '#home'); if (pendingWorker) showUpdate();
}

function handleOrientation() {
  if ($('#gameScreen').hidden || !host.active) return; const portrait = innerHeight > innerWidth;
  if (portrait) { if (!host.active.paused) { host.pause('orientation'); orientationPaused = true; } $('#pauseCard').hidden = true; $('#rotateCard').hidden = false; }
  else { $('#rotateCard').hidden = true; if (orientationPaused && host.active.pauseReason === 'orientation') host.resume(); else if (host.active.paused && host.active.pauseReason === 'player') $('#pauseCard').hidden = false; orientationPaused = false; }
}

function profileLanes(result) { return result.mode === 'solo' ? [{ profileIndex: result.soloPlayer, lane: 0 }] : [{ profileIndex: 0, lane: 0 }, { profileIndex: 1, lane: 1 }]; }
function completeMatch(result) {
  const playedSeconds = Math.max(1, Math.round((Date.now() - gameStartedAt) / 1000)); session.rounds += result.roundsCompleted; session.pops += result.totalPops; session.secondsPlayed += playedSeconds; data.shared.totalRounds += result.roundsCompleted; data.shared.totalPops += result.totalPops;
  const active = profileLanes(result);
  for (const { profileIndex, lane } of active) {
    const profile = data.profiles[profileIndex]; const stats = profile.stats; const game = stats.bubbleBlast; const attempts = result.pops[lane] + result.misses[lane]; const accuracy = attempts ? result.pops[lane] / attempts : 0; const medal = result.medals[lane];
    stats.rounds += result.roundsCompleted; stats.pops += result.pops[lane]; stats.misses += result.misses[lane]; stats.highScore = Math.max(stats.highScore, result.scores[lane]); stats.bestCombo = Math.max(stats.bestCombo, result.bestCombos[lane]);
    game.games++; game[result.format === 'tournament' ? 'tournaments' : 'classicGames']++; game[`${result.mode}Games`]++; game.powerUps += result.powerUps[lane]; game.teamRewards += result.teamRewards; game.totalScore += result.scores[lane]; game.bestAccuracy = Math.max(game.bestAccuracy, accuracy); game.highScores[result.mode] = Math.max(game.highScores[result.mode], result.scores[lane]); if (accuracy === 1 && result.pops[lane] >= 15) game.perfectGames++; if (medal !== 'starter') game.medals[medal]++;
  }
  if (result.mode === 'versus' && result.winnerLane >= 0) { data.profiles[result.winnerLane].stats.wins++; if (result.format === 'tournament') data.profiles[result.winnerLane].stats.bubbleBlast.tournamentWins++; }
  if (result.format === 'tournament' && result.tournamentWon && result.mode !== 'versus') for (const { profileIndex } of active) data.profiles[profileIndex].stats.bubbleBlast.tournamentWins++;
  const sharedGame = data.shared.bubbleBlast; sharedGame.teamBest = Math.max(sharedGame.teamBest, result.teamScore); sharedGame.teamRewards += result.teamRewards; sharedGame.powerUps += result.powerUps[0] + result.powerUps[1]; if (result.mode === 'coop' && result.medals[0] !== 'starter') sharedGame.medals[result.medals[0]]++;
  const unlocked = evaluateAchievements(data, result); storage.save(); renderAll(); renderResult(result, unlocked); if (unlocked.length) setTimeout(() => audio.unlock(), 250); openDialog($('#resultDialog'));
}

function renderResult(result, unlocked) {
  const solo = result.mode === 'solo'; const activeProfiles = profileLanes(result); const medalRank = { starter: 0, bronze: 1, silver: 2, gold: 3 }; const bestMedal = result.medals.reduce((best, medal) => medalRank[medal] > medalRank[best] ? medal : best, 'starter');
  $('#resultEyebrow').textContent = result.format === 'tournament' ? 'Tournament complete' : '60-second classic complete'; $('#resultMedal').className = `result-medal ${bestMedal}`; $('#resultMedal').textContent = bestMedal === 'gold' ? '★' : bestMedal === 'silver' ? '◆' : bestMedal === 'bronze' ? '●' : '✦';
  if (solo) { const name = data.profiles[result.soloPlayer].name; $('#resultTitle').textContent = result.medals[0] === 'gold' ? `${name} struck gold!` : `${name}, great popping!`; $('#resultSummary').textContent = `${result.scores[0]} points, ${result.pops[0]} pops, and a best combo of ${result.bestCombos[0]}×.`; }
  else if (result.mode === 'coop') { $('#resultTitle').textContent = result.teamRewards ? 'Goal getters!' : 'Brilliant teamwork!'; $('#resultSummary').textContent = `Together you scored ${result.teamScore} points and earned ${result.teamRewards} team reward${result.teamRewards === 1 ? '' : 's'}.`; }
  else if (result.winnerLane < 0) { $('#resultTitle').textContent = 'A perfect tie!'; $('#resultSummary').textContent = 'Two equally speedy bubble blasters. A rematch awaits.'; }
  else { const winner = data.profiles[result.winnerLane].name; $('#resultTitle').textContent = `${winner} wins!`; $('#resultSummary').textContent = result.format === 'tournament' ? `${winner} takes the cup ${result.roundWins[0]}–${result.roundWins[1]}. Brag kindly.` : 'A fast, fair finish. Brag kindly.'; }
  $('#resultScores').innerHTML = activeProfiles.map(({ profileIndex, lane }) => { const attempts = result.pops[lane] + result.misses[lane]; const accuracy = attempts ? Math.round(result.pops[lane] / attempts * 100) : 0; return `<div class="result-score"><span class="mini-medal ${result.medals[lane]}">${result.medals[lane] === 'starter' ? '✦' : result.medals[lane][0].toUpperCase()}</span><strong>${result.scores[lane]}</strong><span>${escapeText(data.profiles[profileIndex].name)} · ${accuracy}% · ${result.bestCombos[lane]}×</span></div>`; }).join('');
  $('#roundRecap').hidden = result.format !== 'tournament'; $('#roundRecap').innerHTML = result.format === 'tournament' ? result.roundResults.map(round => `<span><b>R${round.number}</b>${round.scores[0]}${result.mode === 'solo' ? '' : ` – ${round.scores[1]}`}</span>`).join('') : '';
  $('#newTrophies').innerHTML = unlocked.length ? `<div class="trophy-unlock">🏆 New: ${unlocked.map(item => item.title).join(' · ')}</div>` : '';
}

function exportProgress() { const blob = new Blob([storage.exportText()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `pixel-arcade-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); showToast('Backup downloaded'); }
async function importProgress(event) { const [file] = event.target.files; event.target.value = ''; if (!file) return; try { data = storage.importText(await file.text()); renderAll(); showToast('Progress restored ✨'); } catch (error) { showInfo({ title: 'That backup did not work', text: error.message || 'Choose a Pixel Arcade JSON backup and try again.', eyebrow: 'Import help', icon: '!' }); } }
function resetProgress() { if (!confirm('Reset both players, every score, and all trophies? This cannot be undone unless you exported a backup.')) return; data = storage.reset(); session.rounds = 0; session.pops = 0; session.secondsPlayed = 0; renderAll(); showToast('Arcade progress reset'); }

function bindEvents() {
  $('#enterArcade').addEventListener('click', () => { audio.click(); $('#welcomeScreen').classList.add('is-leaving'); setTimeout(() => { $('#welcomeScreen').hidden = true; $('#arcadeShell').hidden = false; }, data.settings.reducedMotion ? 10 : 480); });
  $$('[data-view]').forEach(button => button.addEventListener('click', () => { audio.click(); showView(button.dataset.view); })); $$('.profile-card').forEach(card => card.addEventListener('click', () => setActivePlayer(card.dataset.profile)));
  $('#activePlayerButton').addEventListener('click', () => setActivePlayer(data.activeProfile ? 0 : 1)); $('#editProfilesButton').addEventListener('click', openProfiles); $('#profileForm').addEventListener('submit', saveProfiles);
  $('#playFeaturedButton').addEventListener('click', openModeDialog); $('#gameSetupForm').addEventListener('submit', event => { event.preventDefault(); startGame(gameConfigFromForm()); });
  $$('.coming-button').forEach(button => button.addEventListener('click', () => showInfo({ title: button.dataset.coming, text: 'This adventure is reserved for a future game pack. Bubble Blast Duo is the fully playable game in this release.', icon: '✦' })));
  $('#pauseGameButton').addEventListener('click', pauseGame); $('#exitGameButton').addEventListener('click', pauseGame); $('#resumeGameButton').addEventListener('click', resumeGame); $('#retryGameButton').addEventListener('click', retryGame); $('#pauseExitButton').addEventListener('click', () => exitGame()); $('#rotateExitButton').addEventListener('click', () => exitGame());
  $('#playAgainButton').addEventListener('click', () => startGame(lastGameConfig, false)); $('#changeModeButton').addEventListener('click', () => { safeClose($('#resultDialog')); exitGame(); openModeDialog(); }); $('#resultExitButton').addEventListener('click', () => { safeClose($('#resultDialog')); exitGame(); });
  const settingMap = { soundSetting: 'sound', musicSetting: 'music', hapticsSetting: 'haptics', motionSetting: 'reducedMotion', contrastSetting: 'highContrast', largeSetting: 'largeControls' };
  Object.entries(settingMap).forEach(([id,key]) => $(`#${id}`).addEventListener('change', event => { data.settings[key] = event.target.checked; storage.save(); applySettings(); if (key === 'music') audio.syncMusic(host.isPlaying); else if (key !== 'sound') audio.click(); showToast('Setting saved'); }));
  $('#exportButton').addEventListener('click', exportProgress); $('#importButton').addEventListener('click', () => $('#importFile').click()); $('#importFile').addEventListener('change', importProgress); $('#resetButton').addEventListener('click', resetProgress);
  $('#installButton').addEventListener('click', async () => { if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; } else showInfo({ title: 'Install Pixel Arcade', eyebrow: 'Play offline', icon: '⇩', text: 'On Chrome, open the browser menu and choose “Install app” or “Add to Home screen.” Once installed, the arcade launches full-screen and works offline.' }); });
  $('#updateButton').addEventListener('click', () => pendingWorker?.postMessage({ type: 'SKIP_WAITING' })); $('#dismissUpdate').addEventListener('click', () => { $('#updateBanner').hidden = true; }); window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; });
  window.addEventListener('popstate', () => { if (!$('#gameScreen').hidden) { exitGame(true); return; } showView(location.hash.replace('#','') || 'home', false); }); window.addEventListener('resize', handleOrientation);
  document.addEventListener('visibilitychange', () => { if (document.hidden && host.isPlaying) pauseGame(); });
}

function showUpdate() { if (host.isPlaying || !pendingWorker) return; $('#updateBanner').hidden = false; }
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try { const registration = await navigator.serviceWorker.register('./service-worker.js'); if (registration.waiting) { pendingWorker = registration.waiting; showUpdate(); }
    registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) { pendingWorker = worker; showUpdate(); } }); }); navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  } catch (error) { console.warn('Offline setup was unavailable.', error); }
}

$('#versionLabel').textContent = `Pixel Arcade v${APP_VERSION} · Offline ready`; bindEvents(); renderAll(); showView(location.hash.replace('#','') || 'home', false); registerServiceWorker();
