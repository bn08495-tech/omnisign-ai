/**
 * OmniSign AI - Two-Way Sign Language & Voice Translator
 * Complete Client-Side Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Voice Activity Detection Helper
  class VoiceActivityDetector {
    constructor(callback) {
      this.callback = callback;
      this.isSpeaking = false;
      this.threshold = 0.05;
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.context.createAnalyser();
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    
    async start() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.detect();
    }

    detect() {
      this.analyser.getByteFrequencyData(this.dataArray);
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) sum += this.dataArray[i];
      const avg = sum / this.dataArray.length;
      if (avg > 20 && !this.isSpeaking) {
        this.isSpeaking = true;
        this.callback(true);
      } else if (avg <= 20 && this.isSpeaking) {
        this.isSpeaking = false;
        this.callback(false);
      }
      requestAnimationFrame(() => this.detect());
    }
  }

  // Kinematic Rules for Dialects
  const DialectRules = {
    ASL: { speed: 1.0, movement: 'fluid', fingerspelling: 'dominant' },
    BSL: { speed: 1.2, movement: 'staccato', fingerspelling: 'two-handed' },
    ISL: { speed: 1.1, movement: 'precise', fingerspelling: 'one-handed' }
  };

  // State Management
  const AppState = {
    currentTab: 'home',
    dictionary: { words: [], alphabets: [], categories: [] },
    
    // Multi-Dialect State
    currentDialect: 'ASL',
    
    // Voice to Sign State
    v2s: {
      tokens: [],
      currentIndex: 0,
      isPlaying: false,
      isListening: false,
      speed: 1.0,
      isLooping: false,
      timer: null,
      recognition: null,
      vad: null,
      autoVadCommit: true,
      lastSpokenTranscript: '',
      voices: []
    },

    // S2V & Vision State
    s2v: {
      isCamActive: false,
      camera: null,
      hands: null,
      currentSign: null,
      lastSign: null,
      holdStartTime: 0,
      holdThresholdMs: 1200,
      buffer: '',
      autoSpeak: true,
      autoAppend: true,
      voices: [],
      selectedVoice: null
    },

    // Bridge State
    bridge: {
      messages: [],
      isCamActive: false,
      hands: null,
      camera: null,
      signerBuffer: ''
    },

    // Practice State
    practice: {
      isActive: false,
      currentChallenge: null,
      score: 0,
      streak: 0,
      hands: null,
      camera: null
    }
  };

  /* ==========================================================================
     1. TAB NAVIGATION WITH SLIDING MOTION PILL
     ========================================================================== */
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const navDockIndicator = document.getElementById('nav-dock-indicator');

  function updateNavDockIndicator() {
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab && navDockIndicator) {
      navDockIndicator.style.left = `${activeTab.offsetLeft}px`;
      navDockIndicator.style.width = `${activeTab.offsetWidth}px`;
      navDockIndicator.style.top = `${activeTab.offsetTop}px`;
      navDockIndicator.style.height = `${activeTab.offsetHeight}px`;
    }
  }

  function switchTab(tabId) {
    AppState.currentTab = tabId;
    navTabs.forEach(tab => {
      const isActive = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    // Update Sliding Nav Pill
    updateNavDockIndicator();

    // Refresh icons
    if (window.lucide) lucide.createIcons();

    // Scroll main view to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Tab specific setups
    if (tabId === 'home') {
      const heroStaggerItems = document.querySelectorAll('.landing-hero [data-hero-stagger]');
      heroStaggerItems.forEach(el => el.classList.remove('hero-stagger-active'));
      setTimeout(() => {
        heroStaggerItems.forEach(el => el.classList.add('hero-stagger-active'));
      }, 50);
    }
    if (tabId === 'dictionary' && AppState.dictionary.words.length === 0) {
      loadDictionary();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  window.addEventListener('resize', updateNavDockIndicator);

  // Jump Tab buttons from Landing Page
  document.querySelectorAll('[data-jump-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.jumpTab;
      if (targetTab) switchTab(targetTab);
    });
  });

  // Brand Home Button
  const brandHomeBtn = document.getElementById('brand-home-btn');
  if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', () => switchTab('home'));
  }

  // Scroll to Team section handlers
  function scrollToTeamSection() {
    if (AppState.currentTab !== 'home') {
      switchTab('home');
    }
    setTimeout(() => {
      const teamSection = document.getElementById('landing-team-section');
      if (teamSection) {
        teamSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  const scrollToTeamBtn = document.getElementById('scroll-to-team-btn');
  if (scrollToTeamBtn) {
    scrollToTeamBtn.addEventListener('click', scrollToTeamSection);
  }

  const headerMeetTeamBtn = document.getElementById('header-meet-team-btn');
  if (headerMeetTeamBtn) {
    headerMeetTeamBtn.addEventListener('click', scrollToTeamSection);
  }

  /* ==========================================================================
     2. VOICE TO SIGN (V2S) MODULE
     ========================================================================== */
  const v2sMicBtn = document.getElementById('v2s-mic-btn');
  const v2sMicLabel = document.getElementById('v2s-mic-label');
  const v2sAudioWave = document.getElementById('v2s-audio-wave');
  const v2sTextInput = document.getElementById('v2s-text-input');
  const v2sClearBtn = document.getElementById('v2s-clear-btn');
  const v2sTranslateBtn = document.getElementById('v2s-translate-btn');
  const v2sSpeakTextBtn = document.getElementById('v2s-speak-text-btn');

  const v2sSignImg = document.getElementById('v2s-sign-image');
  const v2sPlaceholder = document.getElementById('v2s-sign-placeholder');
  const v2sCurrentType = document.getElementById('v2s-current-type');
  const v2sCurrentWord = document.getElementById('v2s-current-word');
  const v2sProgressBadge = document.getElementById('v2s-progress-badge');
  const v2sProgressFill = document.getElementById('v2s-progress-fill');
  const v2sTimeline = document.getElementById('v2s-sequence-timeline');
  const v2sStatsText = document.getElementById('v2s-stats-text');

  const v2sPlayBtn = document.getElementById('v2s-play-btn');
  const v2sPrevBtn = document.getElementById('v2s-prev-btn');
  const v2sNextBtn = document.getElementById('v2s-next-btn');
  const v2sLoopBtn = document.getElementById('v2s-loop-btn');
  const v2sSpeedBtns = document.querySelectorAll('.btn-speed');

  // Speech Recognition Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    AppState.v2s.recognition = new SpeechRecognition();
    AppState.v2s.recognition.continuous = false;
    AppState.v2s.recognition.interimResults = false;
    AppState.v2s.recognition.lang = 'en-US';

    AppState.v2s.recognition.onstart = () => {
      AppState.v2s.isListening = true;
      v2sMicBtn.classList.add('listening');
      v2sAudioWave.classList.add('active');
      v2sMicLabel.textContent = 'Listening... Speak clearly now';
    };

    AppState.v2s.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      v2sTextInput.value = transcript;
      v2sMicLabel.textContent = `Heard: "${transcript}"`;
      translateText(transcript);
    };

    AppState.v2s.recognition.onerror = (e) => {
      v2sMicLabel.textContent = `Mic error (${e.error}). Type phrase below.`;
      stopListening();
    };

    AppState.v2s.recognition.onend = () => {
      stopListening();
    };
  } else {
    v2sMicLabel.textContent = 'Speech recognition not supported in this browser. Use text input.';
  }

  // Multi-Dialect Selector
  const appDialectSelect = document.getElementById('app-dialect-select');
  const headerDialectPill = document.getElementById('header-dialect-pill');
  if (appDialectSelect) {
    appDialectSelect.addEventListener('change', (e) => {
      AppState.currentDialect = e.target.value;
      if (headerDialectPill) headerDialectPill.textContent = e.target.value;
    });
  }

  // Voice Activity Detection Auto-Commit Toggle
  const v2sVadToggle = document.getElementById('v2s-vad-toggle');
  if (v2sVadToggle) {
    v2sVadToggle.addEventListener('click', () => {
      AppState.v2s.autoVadCommit = !AppState.v2s.autoVadCommit;
      v2sVadToggle.classList.toggle('active', AppState.v2s.autoVadCommit);
      v2sVadToggle.querySelector('span').textContent = `Auto-VAD: ${AppState.v2s.autoVadCommit ? 'ON' : 'OFF'}`;
    });
  }

  function startListening() {
    if (AppState.v2s.recognition && !AppState.v2s.isListening) {
      try {
        AppState.v2s.recognition.start();
        if (!AppState.v2s.vad) {
          AppState.v2s.vad = new VoiceActivityDetector((isSpeaking) => {
            const statusEl = document.getElementById('v2s-vad-status');
            const fillEl = document.getElementById('v2s-vad-fill');
            if (statusEl) {
              statusEl.textContent = isSpeaking ? 'SPEAKING' : 'SILENT';
              statusEl.classList.toggle('active', isSpeaking);
            }
            if (fillEl) {
              fillEl.style.width = isSpeaking ? '85%' : '5%';
            }
            // Auto commit on silence if enabled and text exists
            if (!isSpeaking && AppState.v2s.autoVadCommit && v2sTextInput.value.trim().length > 1) {
              stopListening();
              translateText(v2sTextInput.value.trim());
            }
          });
        }
        AppState.v2s.vad.start();
      } catch (err) {
        console.error(err);
      }
    }
  }

  function stopListening() {
    AppState.v2s.isListening = false;
    v2sMicBtn.classList.remove('listening');
    v2sAudioWave.classList.remove('active');
    if (AppState.v2s.recognition) {
      try { AppState.v2s.recognition.stop(); } catch(e) {}
    }
    const fillEl = document.getElementById('v2s-vad-fill');
    const statusEl = document.getElementById('v2s-vad-status');
    if (fillEl) fillEl.style.width = '0%';
    if (statusEl) {
      statusEl.textContent = 'SILENT';
      statusEl.classList.remove('active');
    }
    if (!v2sTextInput.value) {
      v2sMicLabel.textContent = 'Click mic to start speaking';
    }
  }

  v2sMicBtn.addEventListener('click', () => {
    if (AppState.v2s.isListening) {
      AppState.v2s.recognition?.stop();
      stopListening();
    } else {
      startListening();
    }
  });

  v2sClearBtn.addEventListener('click', () => {
    v2sTextInput.value = '';
    v2sTextInput.focus();
  });

  // Quick Preset Chips & Scrubber Seeking
  document.querySelectorAll('.preset-chip, .chips-container .chip, [data-phrase]').forEach(chip => {
    chip.addEventListener('click', () => {
      const phrase = chip.getAttribute('data-phrase') || chip.textContent.trim();
      v2sTextInput.value = phrase;
      translateText(phrase);
    });
  });

  const v2sScrubberTrack = document.querySelector('.playback-scrubber-track');
  if (v2sScrubberTrack) {
    v2sScrubberTrack.style.cursor = 'pointer';
    v2sScrubberTrack.addEventListener('click', (e) => {
      if (AppState.v2s.tokens.length === 0) return;
      const rect = v2sScrubberTrack.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = clickX / rect.width;
      const targetIdx = Math.min(AppState.v2s.tokens.length - 1, Math.floor(pct * AppState.v2s.tokens.length));
      jumpToToken(targetIdx);
    });
  }

  v2sTranslateBtn.addEventListener('click', () => {
    const text = v2sTextInput.value.trim();
    if (text) translateText(text);
  });

  v2sTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      v2sTranslateBtn.click();
    }
  });

  v2sSpeakTextBtn.addEventListener('click', () => {
    const text = v2sTextInput.value.trim();
    if (text) speakText(text);
  });

  // Translation API Call
  async function translateText(text) {
    if (!text || !text.trim()) return;
    try {
      v2sTranslateBtn.disabled = true;
      clearTimeout(AppState.v2s.timer);
      AppState.v2s.isPlaying = false;
      updatePlayButton();

      const res = await fetch('/api/translate/text-to-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), fingerspell_unknown: true })
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      
      const playableTokens = (data.tokens || []).filter(t => t.type !== 'pause');
      AppState.v2s.tokens = playableTokens;
      AppState.v2s.currentIndex = 0;

      if (data.summary) {
        v2sStatsText.textContent = `${data.summary.words_matched} words matched, ${data.summary.letters_fingerspelled} fingerspelled`;
      }
      renderTimeline();

      if (playableTokens.length > 0) {
        v2sPlaceholder.classList.add('hidden');
        v2sSignImg.classList.remove('hidden');
        playSequence();
      } else {
        v2sPlaceholder.classList.remove('hidden');
        v2sSignImg.classList.add('hidden');
        v2sStatsText.textContent = 'No matching signs or letters found.';
      }
    } catch (err) {
      console.error('Translation error:', err);
      v2sStatsText.textContent = `Translation error: ${err.message || 'Could not connect to server'}`;
    } finally {
      v2sTranslateBtn.disabled = false;
    }
  }

  function renderTimeline() {
    v2sTimeline.innerHTML = '';
    if (AppState.v2s.tokens.length === 0) {
      v2sTimeline.innerHTML = '<div class="empty-timeline-hint">No tokens to display.</div>';
      v2sProgressBadge.textContent = '0 / 0 Signs';
      v2sProgressFill.style.width = '0%';
      return;
    }

    AppState.v2s.tokens.forEach((token, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = `sequence-item ${idx === AppState.v2s.currentIndex ? 'active' : ''}`;
      const textDisplay = token.type === 'word' ? token.text.toUpperCase() : token.letter;
      itemEl.innerHTML = `
        <span class="item-txt">${textDisplay}</span>
        <span class="item-type">${token.type}</span>
      `;
      itemEl.addEventListener('click', () => {
        jumpToToken(idx);
      });
      v2sTimeline.appendChild(itemEl);
    });

    updatePlayerUI();
  }

  function updatePlayerUI() {
    const total = AppState.v2s.tokens.length;
    if (total === 0) return;

    const curr = AppState.v2s.tokens[AppState.v2s.currentIndex];
    if (!curr) return;

    v2sSignImg.src = curr.media_url;
    v2sCurrentType.textContent = curr.type.toUpperCase();
    v2sCurrentWord.textContent = curr.type === 'word' ? curr.text.toUpperCase() : curr.letter;
    
    v2sProgressBadge.textContent = `${AppState.v2s.currentIndex + 1} / ${total} Signs`;
    v2sProgressFill.style.width = `${((AppState.v2s.currentIndex + 1) / total) * 100}%`;

    // Highlight timeline element
    const items = v2sTimeline.querySelectorAll('.sequence-item');
    items.forEach((it, idx) => {
      it.classList.toggle('active', idx === AppState.v2s.currentIndex);
      if (idx === AppState.v2s.currentIndex) {
        it.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  }

  function playSequence() {
    AppState.v2s.isPlaying = true;
    updatePlayButton();
    runSequenceStep();
  }

  function pauseSequence() {
    AppState.v2s.isPlaying = false;
    clearTimeout(AppState.v2s.timer);
    updatePlayButton();
  }

  function updatePlayButton() {
    v2sPlayBtn.innerHTML = AppState.v2s.isPlaying 
      ? '<i data-lucide="pause"></i>' 
      : '<i data-lucide="play"></i>';
    if (window.lucide) lucide.createIcons();
  }

  function runSequenceStep() {
    if (!AppState.v2s.isPlaying) return;
    const tokens = AppState.v2s.tokens;
    if (tokens.length === 0) return;

    updatePlayerUI();

    const curr = tokens[AppState.v2s.currentIndex];
    const duration = (curr.duration_ms || 1200) / AppState.v2s.speed;

    clearTimeout(AppState.v2s.timer);
    AppState.v2s.timer = setTimeout(() => {
      if (AppState.v2s.currentIndex < tokens.length - 1) {
        AppState.v2s.currentIndex++;
        runSequenceStep();
      } else {
        if (AppState.v2s.isLooping) {
          AppState.v2s.currentIndex = 0;
          runSequenceStep();
        } else {
          pauseSequence();
        }
      }
    }, duration);
  }

  function jumpToToken(index) {
    if (index >= 0 && index < AppState.v2s.tokens.length) {
      AppState.v2s.currentIndex = index;
      updatePlayerUI();
      if (AppState.v2s.isPlaying) {
        clearTimeout(AppState.v2s.timer);
        runSequenceStep();
      }
    }
  }

  v2sPlayBtn.addEventListener('click', () => {
    if (AppState.v2s.isPlaying) {
      pauseSequence();
    } else {
      if (AppState.v2s.currentIndex >= AppState.v2s.tokens.length - 1) {
        AppState.v2s.currentIndex = 0;
      }
      playSequence();
    }
  });

  v2sPrevBtn.addEventListener('click', () => {
    jumpToToken(Math.max(0, AppState.v2s.currentIndex - 1));
  });

  v2sNextBtn.addEventListener('click', () => {
    jumpToToken(Math.min(AppState.v2s.tokens.length - 1, AppState.v2s.currentIndex + 1));
  });

  v2sLoopBtn.addEventListener('click', () => {
    AppState.v2s.isLooping = !AppState.v2s.isLooping;
    v2sLoopBtn.classList.toggle('active', AppState.v2s.isLooping);
  });

  v2sSpeedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      v2sSpeedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.v2s.speed = parseFloat(btn.dataset.speed);
      if (AppState.v2s.isPlaying) {
        clearTimeout(AppState.v2s.timer);
        runSequenceStep();
      }
    });
  });

  // V2S Slide Navigation Buttons
  const v2sSlideLeft = document.getElementById('v2s-slide-left');
  const v2sSlideRight = document.getElementById('v2s-slide-right');
  if (v2sSlideLeft && v2sTimeline) {
    v2sSlideLeft.addEventListener('click', () => {
      v2sTimeline.scrollBy({ left: -220, behavior: 'smooth' });
    });
  }
  if (v2sSlideRight && v2sTimeline) {
    v2sSlideRight.addEventListener('click', () => {
      v2sTimeline.scrollBy({ left: 220, behavior: 'smooth' });
    });
  }

  /* ==========================================================================
     3. SIGN TO VOICE (S2V) & COMPUTER VISION
     ========================================================================== */
  const s2vVideo = document.getElementById('s2v-video');
  const s2vCanvas = document.getElementById('s2v-canvas');
  const s2vCtx = s2vCanvas.getContext('2d');
  const s2vCamToggle = document.getElementById('s2v-cam-toggle');
  const s2vStartCamBtn = document.getElementById('s2v-start-cam-btn');
  const s2vCamPlaceholder = document.getElementById('s2v-cam-placeholder');
  const s2vHud = document.getElementById('s2v-hud');
  const s2vHudSign = document.getElementById('s2v-hud-sign');
  const s2vHudConf = document.getElementById('s2v-hud-conf');
  
  const s2vCurrentChar = document.getElementById('s2v-current-char');
  const s2vHoldProgress = document.getElementById('s2v-hold-progress');
  const s2vAutoAppendCheck = document.getElementById('s2v-auto-append');
  const s2vSentenceBuffer = document.getElementById('s2v-sentence-buffer');
  const s2vAddSpaceBtn = document.getElementById('s2v-add-space-btn');
  const s2vBackspaceBtn = document.getElementById('s2v-backspace-btn');
  const s2vClearBufferBtn = document.getElementById('s2v-clear-buffer-btn');
  const s2vSpeakSentenceBtn = document.getElementById('s2v-speak-sentence-btn');
  const s2vVoiceSelect = document.getElementById('s2v-voice-select');
  const s2vAutoSpeakCheck = document.getElementById('s2v-auto-speak');
  const s2vSendToBridgeBtn = document.getElementById('s2v-send-to-bridge-btn');
  const s2vSuggestions = document.getElementById('s2v-suggestions');

  // Populate TTS Voices
  function populateVoices() {
    if ('speechSynthesis' in window) {
      AppState.s2v.voices = window.speechSynthesis.getVoices();
      s2vVoiceSelect.innerHTML = '';
      AppState.s2v.voices.forEach((v, i) => {
        if (v.lang.startsWith('en')) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = `${v.name} (${v.lang})`;
          s2vVoiceSelect.appendChild(opt);
        }
      });
    }
  }
  populateVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  async function speakText(text) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    
    // 1. Try browser Web Speech API
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const selIdx = s2vVoiceSelect ? s2vVoiceSelect.value : null;
        if (selIdx !== null && selIdx !== '' && AppState.s2v.voices[selIdx]) {
          utterance.voice = AppState.s2v.voices[selIdx];
        }
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch (e) {
      console.warn('SpeechSynthesis unavailable, falling back to server TTS:', e);
    }

    // 2. Fallback to server gTTS endpoint
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, lang: 'en' })
      });
      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.warn('Audio playback error:', err));
      }
    } catch (err) {
      console.error('Server TTS error:', err);
    }
  }

  /* ==========================================================================
  // ==========================================================================
  // MULTI-HAND TWO-HANDED & COMPOUND GESTURE CLASSIFIER
  // ==========================================================================
  function classifyHandLandmarks(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    const isIndexExtended = indexTip.y < indexPip.y;
    const isMiddleExtended = middleTip.y < middlePip.y;
    const isRingExtended = ringTip.y < ringPip.y;
    const isPinkyExtended = pinkyTip.y < pinkyPip.y;
    const isThumbExtended = Math.abs(thumbTip.x - indexMcp.x) > 0.07 && thumbTip.y < wrist.y;

    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const indexMiddleDist = dist(indexTip, middleTip);
    const thumbIndexDist = dist(thumbTip, indexTip);

    // 1. OPEN PALM / HELLO
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbExtended) {
      return { sign: 'HELLO', conf: 96, category: 'gesture' };
    }
    // 2. THUMBS UP / YES
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && thumbTip.y < indexPip.y && thumbTip.y < wrist.y - 0.1) {
      return { sign: 'YES', conf: 95, category: 'gesture' };
    }
    // 3. THUMBS DOWN / NO
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && thumbTip.y > wrist.y + 0.05) {
      return { sign: 'NO', conf: 92, category: 'gesture' };
    }
    // 4. PEACE / V
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      if (indexMiddleDist > 0.05) return { sign: 'V', conf: 95, category: 'alphabet' };
      return { sign: 'U', conf: 90, category: 'alphabet' };
    }
    // 5. I LOVE YOU
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended && isThumbExtended) {
      return { sign: 'I LOVE YOU', conf: 98, category: 'gesture' };
    }
    // 6. OK SIGN
    if (thumbIndexDist < 0.06 && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return { sign: 'OK', conf: 94, category: 'gesture' };
    }
    // 7. POINTING / D / ONE
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      if (thumbTip.y < middlePip.y) return { sign: 'D', conf: 91, category: 'alphabet' };
      return { sign: 'ONE', conf: 88, category: 'number' };
    }
    // 8. LETTER L
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && isThumbExtended) {
      return { sign: 'L', conf: 94, category: 'alphabet' };
    }
    // 9. LETTER W / THREE
    if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended) {
      return { sign: 'W', conf: 92, category: 'alphabet' };
    }
    // 10. LETTER Y / SHAKA
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended && isThumbExtended) {
      return { sign: 'Y', conf: 94, category: 'alphabet' };
    }
    // 11. LETTER B
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && !isThumbExtended) {
      return { sign: 'B', conf: 92, category: 'alphabet' };
    }
    // 12. FIST / A
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      if (thumbTip.x < indexPip.x) return { sign: 'A', conf: 90, category: 'alphabet' };
      return { sign: 'S', conf: 89, category: 'alphabet' };
    }
    // 13. LETTER C
    if (thumbIndexDist > 0.08 && thumbIndexDist < 0.18 && indexTip.y > indexMcp.y * 0.9) {
      return { sign: 'C', conf: 86, category: 'alphabet' };
    }

    return null;
  }

  // Compound Multi-Hand Recognition (Two Hands)
  function classifyMultiHandLandmarks(multiLandmarks) {
    if (!multiLandmarks || multiLandmarks.length === 0) return null;
    
    // If only one hand detected, evaluate single-hand heuristics
    if (multiLandmarks.length === 1) {
      return classifyHandLandmarks(multiLandmarks[0]);
    }

    // Two Hands present: evaluate compound interactions
    const h1 = multiLandmarks[0];
    const h2 = multiLandmarks[1];

    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const wristDist = dist(h1[0], h2[0]);
    const indexTipDist = dist(h1[8], h2[8]);
    const palmCenterDist = dist(h1[9], h2[9]);

    const h1Sign = classifyHandLandmarks(h1);
    const h2Sign = classifyHandLandmarks(h2);

    // 1. PRAY / PLEASE: Both palms flat touching together (fingers up)
    if (h1Sign?.sign === 'B' && h2Sign?.sign === 'B' && palmCenterDist < 0.14) {
      return { sign: 'PLEASE', conf: 97, category: 'gesture', hands: 2 };
    }

    // 2. OPEN PALMS / WELCOME: Both open palms facing camera / up
    if (h1Sign?.sign === 'HELLO' && h2Sign?.sign === 'HELLO') {
      if (wristDist > 0.18) {
        return { sign: 'WELCOME', conf: 98, category: 'gesture', hands: 2 };
      }
      return { sign: 'HELLO', conf: 96, category: 'gesture', hands: 2 };
    }

    // 3. PEACE (BOTH HANDS): Double V signs
    if (h1Sign?.sign === 'V' && h2Sign?.sign === 'V') {
      return { sign: 'PEACE', conf: 99, category: 'gesture', hands: 2 };
    }

    // 4. CLAP / APPLAUSE: Both open hands moving in close proximity
    if (palmCenterDist < 0.12 && indexTipDist < 0.12) {
      return { sign: 'CLAP', conf: 94, category: 'gesture', hands: 2 };
    }

    // 5. HOUSE / ROOF: Index & Middle tips touching forming roof angle
    if (indexTipDist < 0.08 && wristDist > 0.2) {
      return { sign: 'HOUSE', conf: 92, category: 'gesture', hands: 2 };
    }

    // 6. TOGETHER / WITH: Both fists with thumbs touching
    if (h1Sign?.sign === 'A' && h2Sign?.sign === 'A' && palmCenterDist < 0.15) {
      return { sign: 'TOGETHER', conf: 95, category: 'gesture', hands: 2 };
    }

    // Fallback to highest confidence single hand
    if (h1Sign && h2Sign) {
      return h1Sign.conf >= h2Sign.conf ? h1Sign : h2Sign;
    }
    return h1Sign || h2Sign;
  }

  // ==========================================================================
  // TEMPORAL MOTION TRACKER (Dynamic Continuous Gestures & Kinetic Trails)
  // ==========================================================================
  class TemporalMotionTracker {
    constructor(maxHistory = 30) {
      this.maxHistory = maxHistory;
      this.history = []; // [{ x, y, z, time, isHandOpen }]
      this.motionTrails = []; // [{ x, y, alpha }]
    }

    push(landmarks) {
      if (!landmarks || landmarks.length < 21) return;
      const wrist = landmarks[0];
      const indexTip = landmarks[8];
      const now = performance.now();

      // Check if hand is open
      const isIndexExt = landmarks[8].y < landmarks[6].y;
      const isMiddleExt = landmarks[12].y < landmarks[10].y;
      const isRingExt = landmarks[16].y < landmarks[14].y;
      const isPinkyExt = landmarks[20].y < landmarks[18].y;
      const isHandOpen = isIndexExt && isMiddleExt && isRingExt && isPinkyExt;

      this.history.push({
        x: indexTip.x,
        y: indexTip.y,
        wristX: wrist.x,
        wristY: wrist.y,
        time: now,
        isHandOpen
      });

      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      // Add to kinetic motion trail
      this.motionTrails.push({ x: indexTip.x, y: indexTip.y, alpha: 1.0 });
      if (this.motionTrails.length > 20) this.motionTrails.shift();
    }

    drawTrails(ctx) {
      if (!ctx || !ctx.canvas || this.motionTrails.length < 2) return;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;

      ctx.save();
      for (let i = 1; i < this.motionTrails.length; i++) {
        const p1 = this.motionTrails[i - 1];
        const p2 = this.motionTrails[i];
        const alpha = (i / this.motionTrails.length) * 0.65;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2 + (i / this.motionTrails.length) * 3;
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
      ctx.restore();
    }

    analyzeMotion() {
      if (this.history.length < 8) return { dynamicSign: null, flowType: 'STATIC', vectorText: 'STATIC' };

      const latest = this.history[this.history.length - 1];
      const oldest = this.history[0];
      const dt = (latest.time - oldest.time) / 1000;
      if (dt <= 0) return { dynamicSign: null, flowType: 'STATIC', vectorText: 'STATIC' };

      const dx = latest.x - oldest.x;
      const dy = latest.y - oldest.y;
      const totalDist = Math.hypot(dx, dy);
      const speed = totalDist / dt;

      // Count horizontal oscillations (zero crossings in dx)
      let oscillationsX = 0;
      for (let i = 2; i < this.history.length; i++) {
        const d1 = this.history[i - 1].x - this.history[i - 2].x;
        const d2 = this.history[i].x - this.history[i - 1].x;
        if ((d1 > 0.008 && d2 < -0.008) || (d1 < -0.008 && d2 > 0.008)) {
          oscillationsX++;
        }
      }

      // Check Circular Motion (Clockwise curvature)
      let isCircular = false;
      if (this.history.length >= 16) {
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        this.history.forEach(p => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
        const spanX = maxX - minX;
        const spanY = maxY - minY;
        if (spanX > 0.06 && spanY > 0.06 && Math.abs(spanX - spanY) < 0.05 && speed > 0.15) {
          isCircular = true;
        }
      }

      // 1. WAVE / GOODBYE: high horizontal oscillation with open hand
      if (oscillationsX >= 2 && latest.isHandOpen && speed > 0.25) {
        return { dynamicSign: 'WAVE', conf: 96, flowType: 'OSCILLATING', vectorText: 'WAVE (LATERAL)' };
      }

      // 2. THANK YOU (Chin to forward sweep): starting high and moving downwards/outwards
      if (oldest.y < 0.45 && dy > 0.14 && latest.isHandOpen && speed > 0.3) {
        return { dynamicSign: 'THANK YOU', conf: 95, flowType: 'SWEEP_DOWN', vectorText: 'SWEEP (OUTWARD)' };
      }

      // 3. SORRY (Circular chest rub): circular motion
      if (isCircular) {
        return { dynamicSign: 'SORRY', conf: 93, flowType: 'CIRCULAR', vectorText: 'CIRCULAR (CHEST)' };
      }

      // 4. General flow label
      if (speed > 0.4) {
        if (Math.abs(dx) > Math.abs(dy)) {
          return { dynamicSign: null, flowType: 'LATERAL', vectorText: dx > 0 ? 'FLOW: RIGHT' : 'FLOW: LEFT' };
        } else {
          return { dynamicSign: null, flowType: 'VERTICAL', vectorText: dy > 0 ? 'FLOW: DOWN' : 'FLOW: UP' };
        }
      }

      return { dynamicSign: null, flowType: 'STABLE', vectorText: 'FLOW: STABLE' };
    }
  }

  const s2vMotionTracker = new TemporalMotionTracker();
  const bridgeMotionTracker = new TemporalMotionTracker();

  // ==========================================================================
  // FACIAL EXPRESSION & NON-MANUAL MARKER (NMS) ENGINE
  // ==========================================================================
  class FaceExpressionDetector {
    constructor() {
      this.faceMesh = null;
      this.currentExpression = 'NEUTRAL';
      this.currentGrammar = 'STATEMENT';
      this.lastNodTime = 0;
      this.lastShakeTime = 0;
      this.history = [];
    }

    init() {
      if (!window.FaceMesh) {
        console.info('MediaPipe FaceMesh not available, running fallback NMS estimator');
        return;
      }
      try {
        this.faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        this.faceMesh.onResults((res) => this.onFaceResults(res));
      } catch (err) {
        console.warn('FaceMesh initialization skipped:', err);
      }
    }

    async sendFrame(videoEl) {
      if (this.faceMesh && videoEl && videoEl.readyState >= 2) {
        try {
          await this.faceMesh.send({ image: videoEl });
        } catch (e) {}
      }
    }

    onFaceResults(results) {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        this.currentExpression = 'NEUTRAL';
        this.currentGrammar = 'STATEMENT';
        return;
      }

      const l = results.multiFaceLandmarks[0];
      // Key Landmarks:
      // Eyebrow top: 70 (left), 300 (right)
      // Eye center: 159 (left), 386 (right)
      // Mouth corners: 61 (left), 291 (right)
      // Upper & Lower lips: 13, 14
      // Nose tip: 1, Chin: 152

      const leftBrowDist = Math.abs(l[70].y - l[159].y);
      const rightBrowDist = Math.abs(l[300].y - l[386].y);
      const avgBrowDist = (leftBrowDist + rightBrowDist) / 2;

      const mouthOpen = Math.abs(l[13].y - l[14].y);
      const mouthWidth = Math.hypot(l[61].x - l[291].x, l[61].y - l[291].y);
      const mouthCornersY = (l[61].y + l[291].y) / 2;
      const isSmile = mouthCornersY < l[13].y + 0.01 && mouthWidth > 0.16;

      // Head Yaw / Roll
      const noseX = l[1].x;
      this.history.push({ noseX, time: performance.now(), avgBrowDist });
      if (this.history.length > 20) this.history.shift();

      // Check head shake (negation)
      let headShakeCount = 0;
      for (let i = 2; i < this.history.length; i++) {
        const d1 = this.history[i - 1].noseX - this.history[i - 2].noseX;
        const d2 = this.history[i].noseX - this.history[i - 1].noseX;
        if ((d1 > 0.005 && d2 < -0.005) || (d1 < -0.005 && d2 > 0.005)) {
          headShakeCount++;
        }
      }

      // Grammatical Classification
      if (headShakeCount >= 2) {
        this.currentGrammar = 'NEGATION (NOT)';
        this.currentExpression = 'HEAD SHAKE';
      } else if (avgBrowDist > 0.048) {
        this.currentGrammar = 'QUESTION (?)';
        this.currentExpression = 'RAISED BROWS';
      } else if (avgBrowDist < 0.024) {
        this.currentGrammar = 'WH-QUESTION (WHO/WHAT?)';
        this.currentExpression = 'FURROWED BROWS';
      } else if (isSmile) {
        this.currentGrammar = 'POSITIVE (AFFIRM)';
        this.currentExpression = 'SMILING';
      } else if (mouthOpen > 0.04) {
        this.currentGrammar = 'EMPHASIS (!)';
        this.currentExpression = 'OPEN MOUTH';
      } else {
        this.currentGrammar = 'STATEMENT';
        this.currentExpression = 'NEUTRAL';
      }

      this.updateHudBadges();
    }

    updateHudBadges() {
      // S2V HUD update
      const s2vNmsPill = document.getElementById('s2v-nms-pill');
      if (s2vNmsPill) {
        s2vNmsPill.textContent = `NMS: ${this.currentGrammar}`;
      }
      // Bridge HUD update
      const bridgeNmsPill = document.getElementById('bridge-nms-pill');
      if (bridgeNmsPill) {
        bridgeNmsPill.textContent = `NMS: ${this.currentGrammar}`;
      }
    }
  }

  const faceDetector = new FaceExpressionDetector();
  faceDetector.init();

  // Multi-Hand Landmark Visualizer with Handedness Markers
  function drawStyledHand(ctx, landmarks, handIndex = 0) {
    if (!window.drawConnectors || !window.drawLandmarks || !landmarks) return;

    // Clean minimal connectors
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
      color: handIndex === 0 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(200, 200, 200, 0.65)',
      lineWidth: 2
    });

    // Clean minimal landmark joints
    drawLandmarks(ctx, landmarks, {
      color: '#ffffff',
      fillColor: handIndex === 0 ? '#ffffff' : '#a3a3a3',
      lineWidth: 1,
      radius: 3
    });

    // Handedness Label at Wrist
    const wrist = landmarks[0];
    if (wrist && ctx.canvas) {
      const x = wrist.x * ctx.canvas.width;
      const y = wrist.y * ctx.canvas.height;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(handIndex === 0 ? 'H1' : 'H2', x + 8, y + 4);
      ctx.restore();
    }
  }

  // Setup MediaPipe Hands for S2V (Multi-Hand: maxNumHands: 2)
  function setupS2VHands() {
    if (!window.Hands) {
      console.warn('MediaPipe Hands script not loaded');
      return;
    }

    AppState.s2v.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    AppState.s2v.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    AppState.s2v.hands.onResults(onS2VResults);
  }

  function onS2VResults(results) {
    s2vCanvas.width = s2vVideo.videoWidth || 640;
    s2vCanvas.height = s2vVideo.videoHeight || 480;

    s2vCtx.save();
    s2vCtx.clearRect(0, 0, s2vCanvas.width, s2vCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      s2vHud.classList.remove('hidden');

      // Update motion tracker and kinetic trails
      s2vMotionTracker.push(results.multiHandLandmarks[0]);
      s2vMotionTracker.drawTrails(s2vCtx);

      // Draw all tracked hands
      results.multiHandLandmarks.forEach((lmarks, idx) => {
        drawStyledHand(s2vCtx, lmarks, idx);
      });

      // Analyze Temporal Continuous Motion
      const motionAnalysis = s2vMotionTracker.analyzeMotion();
      const s2vMotionPill = document.getElementById('s2v-motion-pill');
      if (s2vMotionPill) {
        s2vMotionPill.textContent = motionAnalysis.vectorText;
      }

      // Classify single or two-handed compound gestures + continuous motion override
      let classification = null;
      if (motionAnalysis.dynamicSign) {
        classification = { sign: motionAnalysis.dynamicSign, conf: motionAnalysis.conf, category: 'dynamic' };
      } else {
        classification = classifyMultiHandLandmarks(results.multiHandLandmarks);
      }

      if (classification) {
        s2vHudSign.textContent = classification.sign;
        s2vHudConf.textContent = `${classification.conf}%`;
        handleRecognizedSign(classification.sign);
      } else {
        s2vHudSign.textContent = 'Tracking...';
        s2vHudConf.textContent = '--';
        resetHoldProgress();
      }
    } else {
      s2vHud.classList.add('hidden');
      resetHoldProgress();
    }
    s2vCtx.restore();
  }

  function handleRecognizedSign(sign) {
    s2vCurrentChar.textContent = sign;
    const now = Date.now();

    if (sign === AppState.s2v.lastSign) {
      const elapsed = now - AppState.s2v.holdStartTime;
      const progress = Math.min(100, (elapsed / AppState.s2v.holdThresholdMs) * 100);
      s2vHoldProgress.style.width = `${progress}%`;

      if (progress >= 100 && AppState.s2v.autoAppend) {
        appendSignToBuffer(sign);
        // Reset timer so it doesn't immediately re-append
        AppState.s2v.holdStartTime = now + 400; 
      }
    } else {
      AppState.s2v.lastSign = sign;
      AppState.s2v.holdStartTime = now;
      s2vHoldProgress.style.width = '0%';
    }
  }

  function resetHoldProgress() {
    AppState.s2v.lastSign = null;
    s2vHoldProgress.style.width = '0%';
    s2vCurrentChar.textContent = '--';
  }

  function appendSignToBuffer(sign) {
    let toAdd = sign;
    if (sign === 'HELLO') toAdd = 'Hello';
    else if (sign === 'YES') toAdd = 'Yes';
    else if (sign === 'NO') toAdd = 'No';
    else if (sign === 'I LOVE YOU') toAdd = 'I love you';
    else if (sign === 'OK') toAdd = 'OK';
    else if (sign === 'WAVE') toAdd = 'Wave';
    else if (sign === 'THANK YOU') toAdd = 'Thank you';
    else if (sign === 'SORRY') toAdd = 'Sorry';
    else if (sign === 'PLEASE') toAdd = 'Please';
    else if (sign === 'WELCOME') toAdd = 'Welcome';

    // Apply grammatical context from Facial Expressions (NMS)
    if (faceDetector.currentGrammar.includes('QUESTION')) {
      toAdd += '? ';
    } else if (faceDetector.currentGrammar.includes('EMPHASIS')) {
      toAdd += '! ';
    } else if (faceDetector.currentGrammar.includes('NEGATION')) {
      toAdd = 'Not ' + toAdd.toLowerCase() + ' ';
    } else {
      toAdd += ' ';
    }
    
    s2vSentenceBuffer.value += toAdd;
    updateSuggestions();

    if (s2vAutoSpeakCheck.checked && (toAdd.endsWith(' ') || toAdd.length > 1)) {
      speakText(toAdd);
    }
  }

  function updateSuggestions() {
    const text = s2vSentenceBuffer.value.trim().toLowerCase();
    const lastWord = text.split(' ').pop();
    if (!lastWord) return;

    const matched = AppState.dictionary.words
      .filter(w => w.word.startsWith(lastWord) && w.word !== lastWord)
      .slice(0, 4);

    s2vSuggestions.innerHTML = '';
    matched.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'sugg-chip';
      btn.textContent = w.word;
      btn.addEventListener('click', () => {
        const words = s2vSentenceBuffer.value.trim().split(' ');
        words.pop();
        words.push(w.word);
        s2vSentenceBuffer.value = words.join(' ') + ' ';
        updateSuggestions();
        if (s2vAutoSpeakCheck.checked) speakText(w.word);
      });
      s2vSuggestions.appendChild(btn);
    });
  }

  // Resilient multi-fallback Camera Media Stream acquisition
  async function getResilientUserMedia() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('InsecureContext');
    }

    const constraintCascade = [
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: { width: { ideal: 640 }, height: { ideal: 480 } } },
      { video: { facingMode: 'user' } },
      { video: true }
    ];

    let lastError = null;
    for (const constraints of constraintCascade) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) return stream;
      } catch (err) {
        lastError = err;
        // If permission explicitly denied, don't keep looping
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw err;
        }
      }
    }
    throw lastError || new Error('No supported camera stream found');
  }

  const s2vCamErrorBox = document.getElementById('s2v-cam-error-box');
  const s2vErrorTitle = document.getElementById('s2v-error-title');
  const s2vErrorDesc = document.getElementById('s2v-error-desc');
  const s2vVirtualCamBtn = document.getElementById('s2v-virtual-cam-btn');
  const s2vVirtualPad = document.getElementById('s2v-virtual-pad');
  const s2vCloseVpad = document.getElementById('s2v-close-vpad');

  function showCameraError(err) {
    s2vCamErrorBox.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      s2vErrorTitle.textContent = 'Camera Permission Blocked';
      s2vErrorDesc.textContent = 'Camera access was denied. Click the lock/camera icon in your address bar, change camera permission to "Allow", and try again.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      s2vErrorTitle.textContent = 'No Camera Device Found';
      s2vErrorDesc.textContent = 'No physical webcam detected on this device. You can use the "Virtual Demo Pad" below to test all sign features!';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      s2vErrorTitle.textContent = 'Camera In Use';
      s2vErrorDesc.textContent = 'Your webcam is being used by another application or browser tab. Please close other camera apps and retry.';
    } else if (err.message === 'InsecureContext') {
      s2vErrorTitle.textContent = 'Insecure Web Origin';
      s2vErrorDesc.textContent = 'Browsers require HTTPS or http://localhost:8000 for webcam access. Please access via localhost.';
    } else {
      s2vErrorTitle.textContent = 'Camera Access Issue';
      s2vErrorDesc.textContent = `Could not start webcam (${err.name || err.message}). Try the Virtual Demo Pad below!`;
    }
  }

  // Virtual Demo Pad Simulator
  function activateVirtualSimulator() {
    s2vVirtualPad.classList.remove('hidden');
    s2vHud.classList.remove('hidden');
    s2vCamPlaceholder.classList.add('hidden');
    s2vHudSign.textContent = 'Virtual Pad Ready';
    s2vHudConf.textContent = '100%';
    s2vCurrentChar.textContent = 'Ready';
  }

  s2vVirtualCamBtn.addEventListener('click', activateVirtualSimulator);

  s2vCloseVpad.addEventListener('click', () => {
    s2vVirtualPad.classList.add('hidden');
    s2vHud.classList.add('hidden');
    s2vCamPlaceholder.classList.remove('hidden');
  });

  document.querySelectorAll('.vpad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sign = btn.dataset.sign;
      s2vHudSign.textContent = sign;
      s2vHudConf.textContent = '99%';
      handleRecognizedSign(sign);
    });
  });

  // Camera start / stop toggles
  async function startS2VCamera() {
    s2vCamErrorBox.classList.add('hidden');
    try {
      if (!AppState.s2v.hands) setupS2VHands();
      
      const stream = await getResilientUserMedia();
      s2vVideo.srcObject = stream;
      await s2vVideo.play();

      if (window.Camera) {
        AppState.s2v.camera = new Camera(s2vVideo, {
          onFrame: async () => {
            if (AppState.s2v.hands && AppState.s2v.isCamActive) {
              await AppState.s2v.hands.send({ image: s2vVideo });
              await faceDetector.sendFrame(s2vVideo);
            }
          },
          width: 640,
          height: 480
        });
        AppState.s2v.camera.start();
      }

      AppState.s2v.isCamActive = true;
      s2vCamPlaceholder.classList.add('hidden');
      s2vCamToggle.innerHTML = '<i data-lucide="video-off"></i><span>Stop Camera</span>';
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Camera access error:', err);
      showCameraError(err);
    }
  }

  function stopS2VCamera() {
    if (s2vVideo.srcObject) {
      s2vVideo.srcObject.getTracks().forEach(t => t.stop());
      s2vVideo.srcObject = null;
    }
    AppState.s2v.isCamActive = false;
    s2vCamPlaceholder.classList.remove('hidden');
    s2vCamToggle.innerHTML = '<i data-lucide="video"></i><span>Start Camera</span>';
    if (window.lucide) lucide.createIcons();
  }

  s2vCamToggle.addEventListener('click', () => {
    if (AppState.s2v.isCamActive) stopS2VCamera();
    else startS2VCamera();
  });

  s2vStartCamBtn.addEventListener('click', startS2VCamera);

  s2vAddSpaceBtn.addEventListener('click', () => {
    s2vSentenceBuffer.value += ' ';
    s2vSentenceBuffer.focus();
  });

  s2vBackspaceBtn.addEventListener('click', () => {
    s2vSentenceBuffer.value = s2vSentenceBuffer.value.slice(0, -1);
    s2vSentenceBuffer.focus();
  });

  s2vClearBufferBtn.addEventListener('click', () => {
    s2vSentenceBuffer.value = '';
    s2vSentenceBuffer.focus();
  });

  s2vSpeakSentenceBtn.addEventListener('click', () => {
    const text = s2vSentenceBuffer.value.trim();
    if (text) speakText(text);
  });

  s2vSendToBridgeBtn.addEventListener('click', () => {
    const text = s2vSentenceBuffer.value.trim();
    if (text) {
      addBridgeMessage('signer', text);
      switchTab('bridge');
    }
  });

  /* ==========================================================================
     4. TWO-WAY CONVERSATION BRIDGE MODE
     ========================================================================== */
  const bridgeMicBtn = document.getElementById('bridge-mic-btn');
  const bridgeSpeakerInput = document.getElementById('bridge-speaker-input');
  const bridgeSpeakerSendBtn = document.getElementById('bridge-speaker-send-btn');
  const bridgeSignImg = document.getElementById('bridge-sign-image');
  const bridgeSignCaption = document.getElementById('bridge-sign-caption');
  
  const bridgeChatFeed = document.getElementById('bridge-chat-feed');
  const bridgeMsgCount = document.getElementById('bridge-msg-count');
  const bridgeClearHistoryBtn = document.getElementById('bridge-clear-history-btn');
  const bridgeExportBtn = document.getElementById('bridge-export-btn');

  const bridgeVideo = document.getElementById('bridge-video');
  const bridgeCanvas = document.getElementById('bridge-canvas');
  const bridgeCamPrompt = document.getElementById('bridge-cam-prompt');
  const bridgeStartCamBtn = document.getElementById('bridge-start-cam-btn');
  const bridgeSignerChar = document.getElementById('bridge-signer-char');
  const bridgeSpeakNowBtn = document.getElementById('bridge-speak-now-btn');

  function relativeTime(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10)  return 'just now';
    if (diff < 60)  return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins === 1) return '1 min ago';
    if (mins < 60)  return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
  }

  function addBridgeMessage(sender, text) {
    if (!text || !text.trim()) return;

    const ts = Date.now();
    const msgObj = { id: ts, sender, text: text.trim(), ts, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    AppState.bridge.messages.push(msgObj);

    if (bridgeChatFeed) {
      const msgEl = document.createElement('div');
      msgEl.className = `chat-msg ${sender}`;
      msgEl.style.cursor = 'pointer';
      const senderLabel = sender === 'speaker' ? 'Speaker' : 'Signer';

      const timeSpanId = `msg-time-${ts}`;
      msgEl.innerHTML = `
        <div class="msg-header">
          <strong>${senderLabel}</strong>
          <span id="${timeSpanId}">${relativeTime(ts)}</span>
        </div>
        <div class="msg-text">${text}</div>
        <div class="msg-actions">
          <button class="msg-btn play-msg-audio" title="Listen Audio">
            <i data-lucide="volume-2"></i> Audio
          </button>
          <button class="msg-btn replay-msg-sign" title="Show Signs">
            <i data-lucide="play-circle"></i> Sign
          </button>
        </div>
      `;

      // Audio & Sign replay bindings
      const audioBtn = msgEl.querySelector('.play-msg-audio');
      if (audioBtn) {
        audioBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          speakText(text);
        });
      }
      const signBtn = msgEl.querySelector('.replay-msg-sign');
      if (signBtn) {
        signBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          bridgePlaySignSequence(text, sender);
        });
      }
      msgEl.addEventListener('click', (e) => {
        if (e.target.closest('.msg-btn')) return;
        bridgePlaySignSequence(text, sender);
      });

      const tsInterval = setInterval(() => {
        const el = document.getElementById(timeSpanId);
        if (el) el.textContent = relativeTime(ts);
        else clearInterval(tsInterval);
      }, 30000);

      bridgeChatFeed.appendChild(msgEl);
      bridgeChatFeed.scrollTop = bridgeChatFeed.scrollHeight;
    }

    if (bridgeMsgCount) {
      bridgeMsgCount.textContent = `${AppState.bridge.messages.length} messages`;
    }
    if (window.lucide) lucide.createIcons();

    // Trigger modality response
    if (sender === 'speaker') {
      bridgePlaySignSequence(text, 'speaker');
    } else if (sender === 'signer') {
      speakText(text);
    }
  }

  let bridgePlaybackSpeed = 1.0;
  let bridgeSignTimer = null;
  let bridgeCurrentTokens = [];
  let bridgeCurrentIndex = 0;
  let bridgeIsPlaying = false;

  const bridgeTokensRow = document.getElementById('bridge-tokens-row');
  const bridgeTimelineProgress = document.getElementById('bridge-timeline-progress');
  const bridgePlayBtn = document.getElementById('bridge-play-btn');
  const bridgePrevBtn = document.getElementById('bridge-prev-btn');
  const bridgeNextBtn = document.getElementById('bridge-next-btn');

  // Speed chips
  const bridgeSpeedChips = document.querySelectorAll('#tab-bridge .speed-chip');
  bridgeSpeedChips.forEach(chip => {
    chip.addEventListener('click', () => {
      bridgeSpeedChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      bridgePlaybackSpeed = parseFloat(chip.getAttribute('data-speed')) || 1.0;
      if (bridgeIsPlaying) {
        bridgeStep();
      }
    });
  });

  function updateBridgePlayBtnUI() {
    if (!bridgePlayBtn) return;
    bridgePlayBtn.innerHTML = bridgeIsPlaying
      ? '<i data-lucide="pause" style="width:13px;height:13px;"></i>'
      : '<i data-lucide="play" style="width:13px;height:13px;"></i>';
    if (window.lucide) lucide.createIcons();
  }

  function renderBridgeTokenCard(idx) {
    if (!bridgeCurrentTokens || bridgeCurrentTokens.length === 0) return;
    if (idx < 0) idx = 0;
    if (idx >= bridgeCurrentTokens.length) {
      idx = bridgeCurrentTokens.length - 1;
    }
    bridgeCurrentIndex = idx;

    const curr = bridgeCurrentTokens[bridgeCurrentIndex];
    if (curr) {
      if (bridgeSignImg) bridgeSignImg.src = curr.media_url;
      if (bridgeSignCaption) {
        bridgeSignCaption.textContent = curr.type === 'word' ? curr.text.toUpperCase() : `Letter: ${curr.letter}`;
      }
    }

    if (bridgeTimelineProgress) {
      bridgeTimelineProgress.textContent = `${bridgeCurrentIndex + 1} / ${bridgeCurrentTokens.length} Signs`;
    }

    if (bridgeTokensRow) {
      const cards = bridgeTokensRow.querySelectorAll('.token-card');
      cards.forEach((c, cIdx) => {
        const isActive = cIdx === bridgeCurrentIndex;
        c.classList.toggle('active', isActive);
        c.style.opacity = isActive ? '1' : (cIdx > bridgeCurrentIndex ? '0.6' : '0.4');
        if (isActive) {
          c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    }
  }

  function bridgeStep() {
    if (!bridgeIsPlaying) return;
    if (bridgeSignTimer) clearTimeout(bridgeSignTimer);

    if (bridgeCurrentIndex >= bridgeCurrentTokens.length) {
      bridgeIsPlaying = false;
      updateBridgePlayBtnUI();
      if (bridgeSignCaption) bridgeSignCaption.textContent = `COMPLETED`;
      return;
    }

    renderBridgeTokenCard(bridgeCurrentIndex);

    const curr = bridgeCurrentTokens[bridgeCurrentIndex];
    const duration = (curr ? curr.duration_ms || 1200 : 1200) / bridgePlaybackSpeed;

    bridgeSignTimer = setTimeout(() => {
      bridgeCurrentIndex++;
      bridgeStep();
    }, duration);
  }

  function bridgePlay() {
    if (bridgeCurrentTokens.length === 0) return;
    if (bridgeCurrentIndex >= bridgeCurrentTokens.length) {
      bridgeCurrentIndex = 0;
    }
    bridgeIsPlaying = true;
    updateBridgePlayBtnUI();
    bridgeStep();
  }

  function bridgePause() {
    bridgeIsPlaying = false;
    if (bridgeSignTimer) clearTimeout(bridgeSignTimer);
    updateBridgePlayBtnUI();
  }

  function bridgeTogglePlay() {
    if (bridgeIsPlaying) {
      bridgePause();
    } else {
      bridgePlay();
    }
  }

  if (bridgePlayBtn) {
    bridgePlayBtn.addEventListener('click', bridgeTogglePlay);
  }

  if (bridgePrevBtn) {
    bridgePrevBtn.addEventListener('click', () => {
      bridgePause();
      if (bridgeCurrentIndex > 0) {
        renderBridgeTokenCard(bridgeCurrentIndex - 1);
      }
    });
  }

  if (bridgeNextBtn) {
    bridgeNextBtn.addEventListener('click', () => {
      bridgePause();
      if (bridgeCurrentIndex < bridgeCurrentTokens.length - 1) {
        renderBridgeTokenCard(bridgeCurrentIndex + 1);
      }
    });
  }

  async function bridgePlaySignSequence(text, sender = null) {
    if (!text || !text.trim()) return;
    try {
      bridgePause();
      if (bridgeSignCaption) bridgeSignCaption.textContent = `Translating...`;
      
      const label = sender ? `[${sender.toUpperCase()}]: ` : '';
      if (typeof LiveSubtitleManager !== 'undefined') {
        LiveSubtitleManager.updateSubtitle('bridge', `${label}${text}`);
      }

      // Highlight active message bubble
      if (bridgeChatFeed) {
        bridgeChatFeed.querySelectorAll('.chat-msg').forEach(m => {
          const tEl = m.querySelector('.msg-text');
          if (tEl && tEl.textContent.trim() === text.trim()) {
            m.style.outline = '2px solid #6366f1';
            m.style.boxShadow = '0 0 14px rgba(99, 102, 241, 0.3)';
          } else {
            m.style.outline = 'none';
            m.style.boxShadow = 'none';
          }
        });
      }

      const res = await fetch('/api/translate/text-to-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), fingerspell_unknown: true })
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const tokens = (data.tokens || []).filter(t => t.type !== 'pause');
      bridgeCurrentTokens = tokens;
      bridgeCurrentIndex = 0;

      if (tokens.length === 0) {
        if (bridgeSignCaption) bridgeSignCaption.textContent = `No signs found`;
        if (bridgeTokensRow) bridgeTokensRow.innerHTML = '<div class="empty-timeline-hint">No signs found for text.</div>';
        if (bridgeTimelineProgress) bridgeTimelineProgress.textContent = '0 / 0 Signs';
        return;
      }

      if (bridgeTokensRow) {
        bridgeTokensRow.innerHTML = '';
        tokens.forEach((t, i) => {
          const card = document.createElement('div');
          card.className = `token-card ${i === 0 ? 'active' : ''}`;
          if (i > 0) card.style.opacity = '0.6';
          const title = t.type === 'word' ? t.text.toUpperCase() : t.letter;
          card.innerHTML = `
            <i data-lucide="${t.type === 'word' ? 'hand' : 'type'}" style="width:18px;height:18px;"></i>
            <span class="token-title">${title}</span>
            <span class="token-type">${t.type.toUpperCase()}</span>
          `;
          card.addEventListener('click', () => {
            bridgePause();
            renderBridgeTokenCard(i);
          });
          bridgeTokensRow.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
      }

      // Auto-start playback
      bridgePlay();
    } catch (e) {
      console.error('Bridge translate error:', e);
      if (bridgeSignCaption) bridgeSignCaption.textContent = `Error translating`;
    }
  }

  if (bridgeSpeakerSendBtn && bridgeSpeakerInput) {
    bridgeSpeakerSendBtn.addEventListener('click', () => {
      const text = bridgeSpeakerInput.value.trim();
      if (text) {
        addBridgeMessage('speaker', text);
        bridgeSpeakerInput.value = '';
      }
    });

    bridgeSpeakerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') bridgeSpeakerSendBtn.click();
    });
  }

  if (bridgeSpeakNowBtn) {
    bridgeSpeakNowBtn.addEventListener('click', () => {
      const text = bridgeSpeakerInput ? bridgeSpeakerInput.value.trim() : '';
      if (text) {
        speakText(text);
      } else if (AppState.bridge.messages.length > 0) {
        const lastMsg = AppState.bridge.messages[AppState.bridge.messages.length - 1];
        speakText(lastMsg.text);
      }
    });
  }

  if (bridgeClearHistoryBtn) {
    bridgeClearHistoryBtn.addEventListener('click', () => {
      AppState.bridge.messages = [];
      if (bridgeChatFeed) {
        bridgeChatFeed.innerHTML = `
          <div class="chat-msg system-msg">
            <i data-lucide="info" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>
            <span>Chat cleared. Type or speak to begin.</span>
          </div>
        `;
      }
      if (bridgeMsgCount) bridgeMsgCount.textContent = '0 messages';
      if (window.lucide) lucide.createIcons();
    });
  }

  if (bridgeExportBtn) {
    bridgeExportBtn.addEventListener('click', () => {
      if (AppState.bridge.messages.length === 0) {
        alert('No messages in transcript to export.');
        return;
      }
      const transcript = AppState.bridge.messages.map(m => `[${m.time || ''}] ${m.sender.toUpperCase()}: ${m.text}`).join('\n');
      const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OmniSign_Transcript_${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
    });
  }

  // Bridge Mic Hook with resilient fallback
  if (bridgeMicBtn) {
    bridgeMicBtn.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        const fallbackText = prompt('Speak / enter your message for the Bridge:');
        if (fallbackText && fallbackText.trim()) {
          addBridgeMessage('speaker', fallbackText.trim());
        }
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      bridgeMicBtn.style.opacity = '0.5';
      
      recognition.onresult = (e) => {
        bridgeMicBtn.style.opacity = '1';
        if (e.results && e.results[0] && e.results[0][0]) {
          const text = e.results[0][0].transcript;
          addBridgeMessage('speaker', text);
        }
      };
      recognition.onerror = (e) => {
        bridgeMicBtn.style.opacity = '1';
        console.warn('Speech recognition error in Bridge:', e.error);
      };
      recognition.onend = () => {
        bridgeMicBtn.style.opacity = '1';
      };
      try {
        recognition.start();
      } catch (err) {
        bridgeMicBtn.style.opacity = '1';
      }
    });
  }


  // Bridge Camera Hook
  let bridgeLastGestureTime = 0;
  let bridgeCurrentGesture = '';
  async function startBridgeCamera() {
    try {
      const stream = await getResilientUserMedia();
      if (!bridgeVideo) return;
      bridgeVideo.srcObject = stream;
      await bridgeVideo.play();
      if (bridgeCamPrompt) bridgeCamPrompt.classList.add('hidden');

      if (bridgeCanvas) {
        bridgeCanvas.width = bridgeVideo.videoWidth || 640;
        bridgeCanvas.height = bridgeVideo.videoHeight || 480;
      }

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({ maxNumHands: 2, minDetectionConfidence: 0.6 });
      hands.onResults((res) => {
        if (bridgeCanvas) {
          const ctx = bridgeCanvas.getContext('2d');
          ctx.save();
          ctx.clearRect(0, 0, bridgeCanvas.width, bridgeCanvas.height);
          if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
            bridgeMotionTracker.push(res.multiHandLandmarks[0]);
            bridgeMotionTracker.drawTrails(ctx);

            res.multiHandLandmarks.forEach((landmarks, idx) => {
              drawStyledHand(ctx, landmarks, idx);
            });
          }
          ctx.restore();
        }

        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
          const motion = bridgeMotionTracker.analyzeMotion();
          const bridgeMotionPill = document.getElementById('bridge-motion-pill');
          if (bridgeMotionPill) {
            bridgeMotionPill.textContent = motion.vectorText;
          }

          let classification = null;
          if (motion.dynamicSign) {
            classification = { sign: motion.dynamicSign, conf: motion.conf };
          } else {
            classification = classifyMultiHandLandmarks(res.multiHandLandmarks);
          }

          if (classification) {
            if (bridgeSignerChar) bridgeSignerChar.textContent = classification.sign;
            const now = Date.now();
            if (classification.sign !== bridgeCurrentGesture || (now - bridgeLastGestureTime > 2500)) {
              bridgeCurrentGesture = classification.sign;
              bridgeLastGestureTime = now;

              let msgText = classification.sign;
              if (faceDetector.currentGrammar.includes('QUESTION')) msgText += '?';
              else if (faceDetector.currentGrammar.includes('EMPHASIS')) msgText += '!';

              addBridgeMessage('signer', msgText);
            }
          }
        }
      });

      const cam = new Camera(bridgeVideo, {
        onFrame: async () => {
          await hands.send({ image: bridgeVideo });
          await faceDetector.sendFrame(bridgeVideo);
        },
        width: 640,
        height: 480
      });
      cam.start();
    } catch (e) {
      console.error(e);
      alert('Camera access issue: ' + (e.name || e.message) + '. Please allow camera access in browser permissions.');
    }
  }

  if (bridgeStartCamBtn) {
    bridgeStartCamBtn.addEventListener('click', startBridgeCamera);
  }

  /* ==========================================================================
     5. VOCABULARY EXPLORER & PRACTICE STUDIO
     ========================================================================== */
  const dictSearchInput = document.getElementById('dict-search-input');
  const dictGridContainer = document.getElementById('dict-grid-container');
  const dictCountBadge = document.getElementById('dict-count-badge');
  const dictCategoryPills = document.getElementById('dict-category-pills');

  const practiceStreak = document.getElementById('practice-streak');
  const practiceScore = document.getElementById('practice-score');
  const practiceTargetWord = document.getElementById('practice-target-word');
  const practiceTargetHint = document.getElementById('practice-target-hint');
  const practiceTargetImg = document.getElementById('practice-target-img');
  const practiceVideo = document.getElementById('practice-video');
  const practiceCanvas = document.getElementById('practice-canvas');
  const practiceFeedback = document.getElementById('practice-feedback');
  const practiceStartBtn = document.getElementById('practice-start-btn');
  const practiceNextBtn = document.getElementById('practice-next-btn');

  async function loadDictionary(category = 'all', search = '') {
    try {
      const url = new URL('/api/dictionary', window.location.origin);
      if (category && category !== 'all' && category !== 'alphabet') url.searchParams.append('category', category);
      if (search) url.searchParams.append('search', search);

      const res = await fetch(url);
      const data = await res.json();
      AppState.dictionary = data;

      renderDictionaryCards(category, search);
    } catch (err) {
      console.error('Error loading dictionary:', err);
    }
  }

  function renderDictionaryCards(category = 'all', search = '') {
    dictGridContainer.innerHTML = '';
    let items = [];

    if (category === 'alphabet') {
      items = AppState.dictionary.alphabets.map(a => ({
        title: `Letter ${a.letter}`,
        subtitle: 'Fingerspelling',
        path: a.path,
        type: 'alphabet',
        target: a.letter
      }));
    } else if (category === 'all') {
      const alph = AppState.dictionary.alphabets.map(a => ({
        title: `Letter ${a.letter}`,
        subtitle: 'Alphabet',
        path: a.path,
        type: 'alphabet',
        target: a.letter
      }));
      const wds = AppState.dictionary.words.map(w => ({
        title: w.word.toUpperCase(),
        subtitle: w.category,
        path: w.path,
        type: 'word',
        target: w.word
      }));
      items = [...alph, ...wds];
    } else {
      items = AppState.dictionary.words.map(w => ({
        title: w.word.toUpperCase(),
        subtitle: w.category,
        path: w.path,
        type: 'word',
        target: w.word
      }));
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q));
    }

    dictCountBadge.textContent = `${items.length} Signs Found`;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dict-card';
      card.innerHTML = `
        <img src="${item.path}" alt="${item.title}" class="dict-thumb" loading="lazy">
        <span class="dict-word-title">${item.title}</span>
        <span class="dict-cat-tag">${item.subtitle}</span>
      `;
      card.addEventListener('click', () => {
        // Load into practice challenge
        setPracticeChallenge(item);
      });
      dictGridContainer.appendChild(card);
    });
  }

  dictSearchInput.addEventListener('input', (e) => {
    const cat = document.querySelector('#dict-category-pills .pill.active')?.dataset.cat || 'all';
    renderDictionaryCards(cat, e.target.value);
  });

  dictCategoryPills.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill')) {
      dictCategoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      const cat = e.target.dataset.cat;
      loadDictionary(cat, dictSearchInput.value);
    }
  });

  /* ==========================================================================
     5b. JOINT ERROR HEATMAP RENDERER
     ========================================================================== */
  class JointHeatmapRenderer {
    constructor() {
      this.canvas = document.getElementById('practice-heatmap-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.smoothedErrors = new Array(21).fill(0);
      this.alpha = 0.3; // exponential smoothing
      
      // Ideal landmark reference poses (normalized finger extension states)
      // Maps target sign -> array of 5 booleans [index, middle, ring, pinky, thumb extended]
      this.targetPoseMap = {
        'A':     [false, false, false, false, false],
        'B':     [true,  true,  true,  true,  false],
        'C':     [false, false, false, false, false], // all curved
        'D':     [true,  false, false, false, false],
        'V':     [true,  true,  false, false, false],
        'L':     [true,  false, false, false, true],
        'Y':     [false, false, false, true,  true],
        'HELLO': [true,  true,  true,  true,  true],
        'YES':   [false, false, false, false, true],
      };
      
      // Joint groups: fingertip indices and their PIP for extension check
      this.fingerJoints = [
        { tip: 8,  pip: 6,  name: 'Index' },
        { tip: 12, pip: 10, name: 'Middle' },
        { tip: 16, pip: 14, name: 'Ring' },
        { tip: 20, pip: 18, name: 'Pinky' },
      ];
      
      // All 21 landmark connections for parent reference
      this.landmarkNames = [
        'Wrist', 'CMC1', 'MCP1', 'IP1', 'Tip1',
        'MCP2', 'PIP2', 'DIP2', 'Tip2',
        'MCP3', 'PIP3', 'DIP3', 'Tip3',
        'MCP4', 'PIP4', 'DIP4', 'Tip4',
        'MCP5', 'PIP5', 'DIP5', 'Tip5'
      ];
      
      this.pulsePhase = 0;
    }

    getTargetPose(sign) {
      return this.targetPoseMap[sign?.toUpperCase()] || null;
    }

    computeJointErrors(landmarks, targetSign) {
      const targetPose = this.getTargetPose(targetSign);
      if (!targetPose || !landmarks || landmarks.length < 21) return null;

      const errors = new Array(21).fill(0);
      
      // Compute per-finger extension errors
      this.fingerJoints.forEach((finger, fIdx) => {
        const tip = landmarks[finger.tip];
        const pip = landmarks[finger.pip];
        const isExtended = tip.y < pip.y;
        const shouldBeExtended = targetPose[fIdx];
        
        // Compute error magnitude from 0 to 1
        const extensionDelta = isExtended === shouldBeExtended ? 0 : 1;
        
        // If partially correct, measure continuous error
        const yDiff = Math.abs(tip.y - pip.y);
        let continuousError = extensionDelta;
        if (extensionDelta > 0) {
          continuousError = Math.min(1, yDiff < 0.02 ? 0.3 : yDiff < 0.05 ? 0.6 : 1);
        }
        
        // Apply error to tip, DIP, PIP joints of this finger
        const fingerLandmarks = [finger.tip, finger.tip - 1, finger.pip];
        fingerLandmarks.forEach(li => {
          errors[li] = continuousError;
        });
        
        // Propagate partial error to MCP
        const mcpIdx = finger.pip - 1;
        errors[mcpIdx] = continuousError * 0.5;
      });

      // Thumb check (index 4 = targetPose[4])
      const thumbTip = landmarks[4];
      const indexMcp = landmarks[5];
      const wrist = landmarks[0];
      const isThumbExtended = Math.abs(thumbTip.x - indexMcp.x) > 0.07 && thumbTip.y < wrist.y;
      const thumbShouldExtend = targetPose[4];
      
      if (isThumbExtended !== thumbShouldExtend) {
        errors[4] = 1; errors[3] = 0.8; errors[2] = 0.5;
      }

      // Exponential smoothing for stable display
      for (let i = 0; i < 21; i++) {
        this.smoothedErrors[i] = this.smoothedErrors[i] * (1 - this.alpha) + errors[i] * this.alpha;
      }

      return this.smoothedErrors;
    }

    render(landmarks, targetSign) {
      if (!this.ctx || !this.canvas || !landmarks || landmarks.length < 21) return;

      const w = this.canvas.parentElement?.clientWidth || 400;
      const h = this.canvas.parentElement?.clientHeight || 300;
      this.canvas.width = w;
      this.canvas.height = h;
      this.ctx.clearRect(0, 0, w, h);

      const errors = this.computeJointErrors(landmarks, targetSign);
      if (!errors) return;

      this.pulsePhase += 0.08;
      const pulse = 0.6 + 0.4 * Math.sin(this.pulsePhase);

      landmarks.forEach((lm, idx) => {
        const x = lm.x * w;
        const y = lm.y * h;
        const err = errors[idx];

        // Color: green(0 error) -> yellow(0.5) -> red(1.0)
        let r, g, b;
        if (err < 0.35) {
          // Perfect – green
          r = 34; g = 197; b = 94;
        } else if (err < 0.7) {
          // Close – yellow
          const t = (err - 0.35) / 0.35;
          r = Math.round(34 + (250 - 34) * t);
          g = Math.round(197 + (204 - 197) * t);
          b = Math.round(94 + (21 - 94) * t);
        } else {
          // Off – red
          const t = (err - 0.7) / 0.3;
          r = Math.round(250 + (239 - 250) * t);
          g = Math.round(204 - 204 * t);
          b = Math.round(21 - 21 * t);
        }

        // Draw glow circle
        const baseRadius = err > 0.5 ? 14 : 8;
        const radius = baseRadius * (err > 0.7 ? pulse : 1);
        const alpha = 0.3 + err * 0.5;

        // Outer glow
        const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // Inner core
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.7 + err * 0.3})`;
        this.ctx.fill();
      });

      // Overall accuracy score
      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
      const accuracy = Math.round((1 - avgError) * 100);
      
      this.ctx.save();
      this.ctx.fillStyle = accuracy > 75 ? '#22c55e' : accuracy > 50 ? '#facc15' : '#ef4444';
      this.ctx.font = 'bold 14px JetBrains Mono, monospace';
      this.ctx.fillText(`Accuracy: ${accuracy}%`, 10, 20);
      this.ctx.restore();

      return accuracy;
    }

    clear() {
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.smoothedErrors.fill(0);
    }
  }

  /* ==========================================================================
     5c. GAMIFIED QUEST PROGRESS MANAGER
     ========================================================================== */
  class QuestProgressManager {
    constructor() {
      this.xp = parseInt(localStorage.getItem('omnisign_xp') || '0');
      this.level = parseInt(localStorage.getItem('omnisign_level') || '1');
      this.dailyStreak = parseInt(localStorage.getItem('omnisign_daily_streak') || '0');
      this.lastPlayDate = localStorage.getItem('omnisign_last_play') || '';
      
      this.xpBadge = document.getElementById('practice-xp-badge');
      this.questFill = document.getElementById('practice-quest-fill');
      this.milestones = document.querySelectorAll('.quest-milestone');
      
      this.milestoneThresholds = [100, 300, 500, 1000];
      this.confettiColors = ['#22c55e', '#facc15', '#ef4444', '#3b82f6', '#a855f7', '#ec4899'];
      
      this.checkDailyReset();
      this.updateUI();
    }

    checkDailyReset() {
      const today = new Date().toISOString().split('T')[0];
      if (this.lastPlayDate !== today) {
        // New day — keep total XP but reset daily tracking
        this.lastPlayDate = today;
        localStorage.setItem('omnisign_last_play', today);
        
        // Increment daily streak if played yesterday
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (this.lastPlayDate === yesterday) {
          this.dailyStreak++;
        }
        localStorage.setItem('omnisign_daily_streak', this.dailyStreak.toString());
      }
    }

    awardXP(amount, reason = '') {
      const prevXP = this.xp;
      this.xp += amount;
      
      // Streak multiplier
      if (this.dailyStreak >= 7) {
        this.xp += Math.round(amount * 0.5); // 50% bonus for 7+ day streak
      } else if (this.dailyStreak >= 3) {
        this.xp += Math.round(amount * 0.25); // 25% bonus for 3+ day streak
      }
      
      localStorage.setItem('omnisign_xp', this.xp.toString());
      
      // Check milestone crossings
      this.milestoneThresholds.forEach((threshold, idx) => {
        if (prevXP < threshold && this.xp >= threshold) {
          this.celebrateMilestone(idx, threshold);
        }
      });
      
      // Level up every 500 XP
      const newLevel = Math.floor(this.xp / 500) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        localStorage.setItem('omnisign_level', this.level.toString());
        this.showLevelUp(newLevel);
      }
      
      this.updateUI();
    }

    updateUI() {
      if (this.xpBadge) {
        this.xpBadge.textContent = `${this.xp} XP`;
        if (this.dailyStreak >= 3) {
          this.xpBadge.textContent += ` (${this.dailyStreak}🔥)`;
        }
      }
      
      // Progress bar based on next milestone
      const maxMilestone = this.milestoneThresholds[this.milestoneThresholds.length - 1];
      const pct = Math.min(100, (this.xp / maxMilestone) * 100);
      if (this.questFill) {
        this.questFill.style.width = `${pct}%`;
      }
      
      // Update milestone achievement states
      this.milestones.forEach(el => {
        const threshold = parseInt(el.dataset.xp);
        if (this.xp >= threshold) {
          el.classList.add('achieved');
        }
      });
    }

    celebrateMilestone(idx, threshold) {
      // Fire confetti burst
      this.spawnConfetti(40);
      
      // Flash the milestone pill
      const el = this.milestones[idx];
      if (el) {
        el.style.transition = 'transform 0.3s ease, color 0.3s ease';
        el.style.transform = 'scale(1.4)';
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 600);
      }
    }

    showLevelUp(level) {
      this.spawnConfetti(60);
      
      // Show a brief level-up toast
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
        background: rgba(0,0,0,0.9); border: 2px solid #facc15; border-radius: 16px;
        padding: 24px 40px; z-index: 10000; text-align: center;
        font-family: 'Plus Jakarta Sans', sans-serif; color: #facc15;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;
      toast.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
        <div style="font-size: 20px; font-weight: 800;">LEVEL ${level}!</div>
        <div style="font-size: 12px; color: #a3a3a3; margin-top: 4px;">Keep signing!</div>
      `;
      document.body.appendChild(toast);
      requestAnimationFrame(() => { toast.style.transform = 'translate(-50%, -50%) scale(1)'; });
      setTimeout(() => {
        toast.style.transform = 'translate(-50%, -50%) scale(0)';
        setTimeout(() => toast.remove(), 400);
      }, 2000);
    }

    spawnConfetti(count = 30) {
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
      document.body.appendChild(container);

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        const color = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
        const x = 40 + Math.random() * 20; // center-ish
        const size = 6 + Math.random() * 8;
        const angle = Math.random() * 360;
        
        particle.style.cssText = `
          position: absolute;
          left: ${x}%;
          top: 40%;
          width: ${size}px;
          height: ${size * (0.5 + Math.random())}px;
          background: ${color};
          border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
          opacity: 1;
          transform: rotate(${angle}deg);
          animation: confettiFall ${1.5 + Math.random() * 1.5}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          animation-delay: ${Math.random() * 0.3}s;
        `;
        container.appendChild(particle);
      }

      // Add confetti animation if not already present
      if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
          @keyframes confettiFall {
            0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(60vh) translateX(${-100 + Math.random() * 200}px) rotate(${360 + Math.random() * 720}deg); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => container.remove(), 3500);
    }
  }

  const heatmapRenderer = new JointHeatmapRenderer();
  const questManager = new QuestProgressManager();

  // Practice Mode Engine
  const PRACTICE_CHALLENGES = [
    { target: 'A', title: 'Letter "A"', hint: 'Make a closed fist with your thumb resting beside index finger.', path: '/assets/alphabet/a_small.gif' },
    { target: 'B', title: 'Letter "B"', hint: 'Hold 4 fingers straight up with thumb folded across palm.', path: '/assets/alphabet/b_small.gif' },
    { target: 'C', title: 'Letter "C"', hint: 'Curve all your fingers into a "C" cup shape.', path: '/assets/alphabet/c_small.gif' },
    { target: 'D', title: 'Letter "D"', hint: 'Point your index finger up while curling others into thumb.', path: '/assets/alphabet/d_small.gif' },
    { target: 'V', title: 'Letter "V" / Peace', hint: 'Extend index and middle fingers in a "V" shape.', path: '/assets/alphabet/v_small.gif' },
    { target: 'L', title: 'Letter "L"', hint: 'Extend index finger up and thumb outward to form an "L".', path: '/assets/alphabet/l_small.gif' },
    { target: 'Y', title: 'Letter "Y"', hint: 'Extend thumb and pinky outwards while curling 3 middle fingers.', path: '/assets/alphabet/y_small.gif' },
    { target: 'HELLO', title: 'Gesture "Hello"', hint: 'Show an open palm with all 5 fingers extended.', path: '/assets/words/today.webp' },
    { target: 'YES', title: 'Gesture "Yes / Thumbs Up"', hint: 'Make a fist with thumb pointing upwards.', path: '/assets/words/sleep.webp' }
  ];

  function setPracticeChallenge(challenge) {
    AppState.practice.currentChallenge = challenge;
    practiceTargetWord.textContent = challenge.title || challenge.target;
    practiceTargetHint.textContent = challenge.hint || `Practice signing ${challenge.target}`;
    practiceTargetImg.src = challenge.path;
    practiceFeedback.className = 'practice-feedback';
    practiceFeedback.innerHTML = `<i data-lucide="camera"></i><span>Mirror the sign in front of your camera</span>`;
    if (window.lucide) lucide.createIcons();
    heatmapRenderer.clear();
  }

  function pickRandomChallenge() {
    const rand = PRACTICE_CHALLENGES[Math.floor(Math.random() * PRACTICE_CHALLENGES.length)];
    setPracticeChallenge(rand);
  }

  async function startPracticeSession() {
    try {
      const stream = await getResilientUserMedia();
      practiceVideo.srcObject = stream;
      await practiceVideo.play();

      AppState.practice.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      AppState.practice.hands.setOptions({ maxNumHands: 2, minDetectionConfidence: 0.65 });

      const pCtx = practiceCanvas.getContext('2d');
      AppState.practice.hands.onResults((res) => {
        practiceCanvas.width = practiceVideo.videoWidth || 400;
        practiceCanvas.height = practiceVideo.videoHeight || 300;
        pCtx.clearRect(0, 0, practiceCanvas.width, practiceCanvas.height);

        if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
          res.multiHandLandmarks.forEach((lmarks, idx) => {
            drawStyledHand(pCtx, lmarks, idx);
          });

          // Render joint error heatmap overlay
          const targetSign = AppState.practice.currentChallenge?.target;
          if (targetSign) {
            const accuracy = heatmapRenderer.render(res.multiHandLandmarks[0], targetSign);
            
            // Award micro-XP for sustained accuracy
            if (accuracy && accuracy > 80) {
              questManager.awardXP(1); // 1 XP per high-accuracy frame (throttled by smoothing)
            }
          }

          const classification = classifyMultiHandLandmarks(res.multiHandLandmarks);
          if (classification && AppState.practice.currentChallenge) {
            checkPracticeMatch(classification.sign);
          }
        } else {
          heatmapRenderer.clear();
        }
      });

      AppState.practice.camera = new Camera(practiceVideo, {
        onFrame: async () => {
          if (AppState.practice.hands) {
            await AppState.practice.hands.send({ image: practiceVideo });
          }
        },
        width: 400,
        height: 300
      });
      AppState.practice.camera.start();
      AppState.practice.isActive = true;
      practiceStartBtn.textContent = 'Session Live';
      practiceStartBtn.disabled = true;
    } catch (e) {
      console.error(e);
      alert('Camera access required for interactive practice.');
    }
  }

  let matchSuccessCooldown = false;
  function checkPracticeMatch(detectedSign) {
    if (matchSuccessCooldown) return;
    const target = AppState.practice.currentChallenge.target.toUpperCase();
    
    if (detectedSign.toUpperCase() === target) {
      matchSuccessCooldown = true;
      AppState.practice.score += 100;
      AppState.practice.streak += 1;
      practiceScore.textContent = AppState.practice.score;
      practiceStreak.textContent = AppState.practice.streak;

      // Award quest XP — bigger bonus for streaks
      const streakBonus = Math.min(AppState.practice.streak * 10, 50);
      questManager.awardXP(50 + streakBonus, `Signed "${target}" correctly`);

      practiceFeedback.className = 'practice-feedback success';
      practiceFeedback.innerHTML = `<i data-lucide="check-circle-2"></i><span>✨ Correct Sign! Excellent Job (+${50 + streakBonus} XP)</span>`;
      if (window.lucide) lucide.createIcons();

      setTimeout(() => {
        matchSuccessCooldown = false;
        pickRandomChallenge();
      }, 1600);
    }
  }

  /* ==========================================================================
     6. LIVE SUBTITLE MANAGER (Burned-in Karaoke CC)
     ========================================================================== */
  class LiveSubtitleManager {
    static updateSubtitle(targetKey, text, activeWordIdx = -1) {
      const elId = targetKey.includes('subtitle-text') ? targetKey : `${targetKey}-subtitle-text`;
      const targetEl = document.getElementById(elId);
      if (!targetEl) return;

      if (!text || !text.trim()) {
        targetEl.textContent = 'Captions ready...';
        return;
      }

      const words = text.trim().split(/\s+/);
      targetEl.innerHTML = '';
      words.forEach((w, idx) => {
        const span = document.createElement('span');
        span.className = `subtitle-word ${idx === activeWordIdx || activeWordIdx === -1 ? 'active' : ''}`;
        span.textContent = w + (idx < words.length - 1 ? ' ' : '');
        targetEl.appendChild(span);
      });
    }
  }

  // Hook live subtitle updates into Bridge and S2V
  const origAddBridgeMessage = addBridgeMessage;
  addBridgeMessage = function(sender, text) {
    origAddBridgeMessage(sender, text);
    LiveSubtitleManager.updateSubtitle('bridge', `[${sender.toUpperCase()}]: ${text}`);
  };

  const origAppendSignToBuffer = appendSignToBuffer;
  appendSignToBuffer = function(sign) {
    origAppendSignToBuffer(sign);
    LiveSubtitleManager.updateSubtitle('s2v', s2vSentenceBuffer.value || sign);
  };

  function initBridgeChatAndTimeline() {
    AppState.bridge.messages = [];
    if (bridgeChatFeed) {
      const chatMsgs = bridgeChatFeed.querySelectorAll('.chat-msg:not(.system-msg)');
      chatMsgs.forEach((msgEl, idx) => {
        const textEl = msgEl.querySelector('.msg-text');
        const text = textEl ? textEl.textContent.trim() : '';
        const isSpeaker = msgEl.classList.contains('speaker');
        const sender = isSpeaker ? 'speaker' : 'signer';
        if (text) {
          AppState.bridge.messages.push({
            id: Date.now() + idx,
            sender,
            text,
            time: msgEl.querySelector('.msg-header span')?.textContent || '10:00 AM'
          });
        }

        // Entire chat bubble click plays sign replay
        msgEl.style.cursor = 'pointer';
        msgEl.addEventListener('click', (e) => {
          if (e.target.closest('.msg-btn')) return;
          bridgePlaySignSequence(text, sender);
        });

        const audioBtn = msgEl.querySelector('.play-msg-audio');
        if (audioBtn && text) {
          audioBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speakText(text);
          });
        }
        const signBtn = msgEl.querySelector('.replay-msg-sign');
        if (signBtn && text) {
          signBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            bridgePlaySignSequence(text, sender);
          });
        }
      });

      if (bridgeMsgCount) {
        bridgeMsgCount.textContent = `${AppState.bridge.messages.length} messages`;
      }
    }

    // Auto-load and play the welcoming initial conversation sequence in Bridge timeline
    const firstMsg = AppState.bridge.messages[0];
    const initialText = firstMsg ? firstMsg.text : "Good morning! What is the weather today?";
    const initialSender = firstMsg ? firstMsg.sender : "speaker";
    bridgePlaySignSequence(initialText, initialSender);

    // Auto-load initial sequence into V2S timeline
    if (v2sTextInput) {
      v2sTextInput.value = "Good morning everyone";
      translateText("Good morning everyone");
    }
  }

  practiceStartBtn.addEventListener('click', startPracticeSession);
  practiceNextBtn.addEventListener('click', pickRandomChallenge);

  /* ==========================================================================
     MOTION.DEV ANIMATIONS & INTERACTIVE PHYSICS
     ========================================================================== */
  function initMotionEngine() {
    document.body.classList.add('motion-ready');

    // 0. Sticky Header Shrink & Frosted Glass Morphing on Scroll
    const appHeader = document.querySelector('.app-header');
    const orb1 = document.querySelector('.orb-1');
    const orb2 = document.querySelector('.orb-2');
    const orb3 = document.querySelector('.orb-3');

    window.addEventListener('scroll', () => {
      const sy = window.scrollY;
      if (appHeader) {
        if (sy > 25) appHeader.classList.add('header-scrolled');
        else appHeader.classList.remove('header-scrolled');
      }

      // Parallax Depth Layering (useScroll / useTransform effect)
      if (orb1) orb1.style.transform = `translate3d(-50%, ${sy * 0.14}px, 0)`;
      if (orb2) orb2.style.transform = `translate3d(${sy * -0.08}px, ${sy * 0.16}px, 0)`;
      if (orb3) orb3.style.transform = `translate3d(${sy * 0.06}px, ${sy * -0.12}px, 0)`;
    }, { passive: true });

    // Trigger Above-The-Fold Hero Staggered Cascade
    setTimeout(() => {
      document.querySelectorAll('.landing-hero [data-hero-stagger]').forEach(el => {
        el.classList.add('hero-stagger-active');
      });
    }, 60);

    // 1. Top Scroll Progress Bar (Motion.dev style)
    const scrollProgressBar = document.getElementById('motion-scroll-progress');
    if (scrollProgressBar) {
      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        scrollProgressBar.style.transform = `scaleX(${progress})`;
      }, { passive: true });
    }

    // 2. Intersection Observer for Scroll Reveals
    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-active');
          
          // Animate Number Counters inside this section/element
          const counters = entry.target.querySelectorAll('[data-counter]');
          counters.forEach(counter => animateNumberCounter(counter));
          if (entry.target.hasAttribute('data-counter')) {
            animateNumberCounter(entry.target);
          }
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('[data-motion]').forEach(el => {
      motionObserver.observe(el);
    });

    // 3. Spring Number Counter Function
    function animateNumberCounter(el) {
      if (el.dataset.animated === 'true') return;
      el.dataset.animated = 'true';

      const target = parseInt(el.dataset.counter, 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1600; // ms
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease Out Quart for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(easeOut * target);

        el.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
        }
      }

      requestAnimationFrame(updateCounter);
    }

    // 4. 3D Perspective Tilt & Dynamic Cursor Spotlight (Framer / Motion.dev)
    const tiltCards = document.querySelectorAll('.interactive-tilt-card');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Set spotlight CSS variables
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Compute 3D rotation angles
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = -((y - centerY) / centerY) * 7.5; // Max 7.5 deg
        const rotateY = ((x - centerX) / centerX) * 7.5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)';
      });
    });

    // 5. Magnetic Button Attraction Physics (Motion.dev Magnetic Effect)
    const magneticElements = document.querySelectorAll('[data-magnetic="true"]');
    magneticElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (e.clientX - centerX) * 0.22;
        const dy = (e.clientY - centerY) * 0.22;

        el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0px, 0px)';
      });
    });

    // 6. Interactive Hero Gesture Simulator & Landmark Canvas Engine
    const simChips = document.querySelectorAll('.sim-chip');
    const simImg = document.getElementById('hero-sim-img');
    const simCanvas = document.getElementById('hero-sim-canvas');
    const simBadgeType = document.getElementById('hero-sim-badge-type');
    const simToken = document.getElementById('hero-sim-token');
    const simTokenIdx = document.getElementById('hero-sim-token-idx');
    const simConfText = document.getElementById('hero-sim-conf-text');
    const simConfFill = document.getElementById('hero-sim-conf-fill');
    const simDesc = document.getElementById('hero-sim-desc');
    const simAudioText = document.getElementById('hero-sim-audio-text');
    const simSpeakBtn = document.getElementById('hero-sim-speak-btn');
    const simReplayBtn = document.getElementById('hero-sim-replay-btn');
    const simCustomInput = document.getElementById('hero-sim-custom-text');
    const simTranslateBtn = document.getElementById('hero-sim-translate-btn');

    let currentSimData = {
      word: 'morning',
      type: 'word',
      conf: 99.6,
      desc: 'Sign moving from chin forward into rising sun arm posture.',
      spoken: 'Good morning! Welcome to OmniSign.'
    };

    let simSequence = [];
    let simSequenceIdx = 0;
    let simSequenceTimer = null;
    let landmarkAnimFrame = null;
    let animPhase = 0;

    // Resolve Media URL safely
    function getMediaUrl(word, type) {
      if (type === 'letter') {
        const cleanLetter = word.replace(/_small$/i, '').toLowerCase();
        return `/assets/alphabet/${cleanLetter}_small.gif`;
      }
      const formatted = word.toLowerCase().trim().replace(/\s+/g, '-');
      return `/assets/words/${formatted}.webp`;
    }

    // Set Active Simulator Sign
    function setSimulatorSign(data, speak = false) {
      currentSimData = { ...currentSimData, ...data };

      if (simImg) {
        simImg.style.opacity = '0.4';
        simImg.style.transform = 'scale(0.95)';
        
        const targetUrl = data.url || getMediaUrl(data.word, data.type);
        const tempImg = new Image();
        tempImg.onload = () => {
          simImg.src = targetUrl;
          simImg.style.opacity = '1';
          simImg.style.transform = 'scale(1)';
        };
        tempImg.onerror = () => {
          // Fallback to letter
          const fallbackLetter = (data.word || 'h')[0].toLowerCase();
          simImg.src = `/assets/alphabet/${fallbackLetter}_small.gif`;
          simImg.style.opacity = '1';
          simImg.style.transform = 'scale(1)';
        };
        tempImg.src = targetUrl;
      }

      if (simToken) simToken.textContent = `"${(data.word || '').toUpperCase()}"`;
      if (simBadgeType) simBadgeType.textContent = data.type === 'letter' ? 'ALPHABET SIGN' : 'WORD SIGN';
      if (simConfText) simConfText.textContent = `${data.conf || 99.4}%`;
      if (simConfFill) simConfFill.style.width = `${data.conf || 99.4}%`;
      if (simDesc) simDesc.textContent = data.desc || `Live sign articulation for "${data.word}".`;
      
      if (simAudioText) {
        const textSpan = simAudioText.querySelector('span');
        if (textSpan) textSpan.textContent = `"${data.spoken || data.word}"`;
      }

      if (speak && data.spoken) {
        speakText(data.spoken);
      }
    }

    // Interactive Chip Click Handler
    simChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (simSequenceTimer) clearTimeout(simSequenceTimer);
        simChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const word = chip.dataset.simWord;
        const type = chip.dataset.simType;
        const conf = parseFloat(chip.dataset.simConf) || 99.4;
        const desc = chip.dataset.simDesc;
        const spoken = chip.dataset.simSpoken || chip.textContent.replace(/^[^\s]+\s*/, '');

        if (simTokenIdx) simTokenIdx.textContent = '1 / 1';

        setSimulatorSign({
          word,
          type,
          conf,
          desc,
          spoken
        });
      });
    });

    // Custom Text Synthesis in Simulator
    async function synthesizeCustomSimulatorText() {
      if (!simCustomInput) return;
      const text = simCustomInput.value.trim();
      if (!text) return;

      try {
        if (simTranslateBtn) simTranslateBtn.disabled = true;
        if (simSequenceTimer) clearTimeout(simSequenceTimer);
        simChips.forEach(c => c.classList.remove('active'));

        const res = await fetch('/api/translate/text-to-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, fingerspell_unknown: true })
        });
        const data = await res.json();
        const tokens = (data.tokens || []).filter(t => t.type !== 'pause');

        if (tokens.length === 0) {
          if (simDesc) simDesc.textContent = 'No matching sign or letter assets found.';
          return;
        }

        simSequence = tokens;
        simSequenceIdx = 0;

        function playNextSimToken() {
          if (simSequenceIdx >= simSequence.length) {
            simSequenceIdx = 0;
          }
          const t = simSequence[simSequenceIdx];
          const tokenWord = t.type === 'word' ? t.text : t.letter;
          
          if (simTokenIdx) simTokenIdx.textContent = `${simSequenceIdx + 1} / ${simSequence.length}`;

          setSimulatorSign({
            word: tokenWord,
            type: t.type,
            url: t.media_url || t.path,
            conf: 99.5,
            desc: `Synthesizing token "${tokenWord}" (${t.type}) in continuous sequence.`,
            spoken: text
          });

          simSequenceIdx++;
          if (simSequenceIdx < simSequence.length) {
            const delay = t.type === 'word' ? 2200 : 900;
            simSequenceTimer = setTimeout(playNextSimToken, delay);
          }
        }

        playNextSimToken();
        speakText(text);

      } catch (err) {
        console.error('Simulator synthesis error:', err);
      } finally {
        if (simTranslateBtn) simTranslateBtn.disabled = false;
      }
    }

    if (simTranslateBtn) {
      simTranslateBtn.addEventListener('click', synthesizeCustomSimulatorText);
    }
    if (simCustomInput) {
      simCustomInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') synthesizeCustomSimulatorText();
      });
    }

    // Action Buttons
    if (simSpeakBtn) {
      simSpeakBtn.addEventListener('click', () => {
        speakText(currentSimData.spoken || currentSimData.word);
      });
    }

    if (simReplayBtn) {
      simReplayBtn.addEventListener('click', () => {
        setSimulatorSign(currentSimData, true);
      });
    }

    // Continuous 60 FPS Hand Landmarks Animation Loop
    function renderLandmarkLoop() {
      if (!simCanvas) return;
      const ctx = simCanvas.getContext('2d');
      const w = simCanvas.width = simCanvas.offsetWidth || 340;
      const h = simCanvas.height = simCanvas.offsetHeight || 280;
      ctx.clearRect(0, 0, w, h);

      animPhase += 0.04;

      const cx = w * 0.5 + Math.sin(animPhase * 0.8) * 6;
      const cy = h * 0.55 + Math.cos(animPhase) * 4;
      const scale = Math.min(w, h) * 0.44;

      const wave = Math.sin(animPhase * 2);

      const joints = [
        { x: cx, y: cy + scale * 0.52 }, // 0 Wrist
        { x: cx - scale * 0.24, y: cy + scale * 0.32 }, // 1
        { x: cx - scale * 0.38, y: cy + scale * 0.14 }, // 2
        { x: cx - scale * 0.44 + wave * 3, y: cy - scale * 0.04 }, // 3
        { x: cx - scale * 0.47 + wave * 5, y: cy - scale * 0.18 }, // 4 Thumb
        { x: cx - scale * 0.14, y: cy }, // 5
        { x: cx - scale * 0.17, y: cy - scale * 0.24 }, // 6
        { x: cx - scale * 0.19, y: cy - scale * 0.42 }, // 7
        { x: cx - scale * 0.21 - wave * 2, y: cy - scale * 0.56 }, // 8 Index
        { x: cx + scale * 0.02, y: cy - scale * 0.02 }, // 9
        { x: cx + scale * 0.02, y: cy - scale * 0.28 }, // 10
        { x: cx + scale * 0.02, y: cy - scale * 0.46 }, // 11
        { x: cx + scale * 0.02, y: cy - scale * 0.61 }, // 12 Mid
        { x: cx + scale * 0.18, y: cy + scale * 0.02 }, // 13
        { x: cx + scale * 0.2, y: cy - scale * 0.23 }, // 14
        { x: cx + scale * 0.22, y: cy - scale * 0.39 }, // 15
        { x: cx + scale * 0.23 + wave * 2, y: cy - scale * 0.52 }, // 16 Ring
        { x: cx + scale * 0.32, y: cy + scale * 0.1 }, // 17
        { x: cx + scale * 0.35, y: cy - scale * 0.12 }, // 18
        { x: cx + scale * 0.38, y: cy - scale * 0.27 }, // 19
        { x: cx + scale * 0.4 + wave * 4, y: cy - scale * 0.39 } // 20 Pinky
      ];

      const bones = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17]
      ];

      // Draw Lines
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;

      bones.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(joints[i].x, joints[i].y);
        ctx.lineTo(joints[j].x, joints[j].y);
        ctx.stroke();
      });

      // Draw Keypoint Nodes
      joints.forEach((pt, idx) => {
        const isTip = idx === 4 || idx === 8 || idx === 12 || idx === 16 || idx === 20;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isTip ? 4.5 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#22c55e' : '#ffffff';
        ctx.shadowColor = isTip ? '#22c55e' : '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fill();
      });

      landmarkAnimFrame = requestAnimationFrame(renderLandmarkLoop);
    }

    renderLandmarkLoop();

    // 7. Web Audio Neon Oscilloscope Loop for Hero Simulator
    const audioOscCanvas = document.getElementById('hero-sim-audio-canvas');
    let oscPhase = 0;
    function renderAudioOscilloscope() {
      if (!audioOscCanvas) return;
      const ctx = audioOscCanvas.getContext('2d');
      const w = audioOscCanvas.width = audioOscCanvas.offsetWidth || 300;
      const h = audioOscCanvas.height = audioOscCanvas.offsetHeight || 38;
      ctx.clearRect(0, 0, w, h);

      oscPhase += 0.08;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const normX = x / w;
        const env = Math.sin(normX * Math.PI);
        const y = h / 2 + Math.sin(normX * 16 + oscPhase) * Math.sin(normX * 8 - oscPhase * 0.5) * (h * 0.35) * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      requestAnimationFrame(renderAudioOscilloscope);
    }
    renderAudioOscilloscope();

    // 8. Floating Accessibility Hub Controls
    const a11yBtn = document.getElementById('header-a11y-btn');
    const a11yPanel = document.getElementById('a11y-floating-panel');
    const a11yCloseBtn = document.getElementById('a11y-close-btn');
    const a11yContrastToggle = document.getElementById('a11y-contrast-toggle');
    const a11yDyslexicToggle = document.getElementById('a11y-dyslexic-toggle');
    const a11ySubtitlesToggle = document.getElementById('a11y-subtitles-toggle');

    window.closeA11yPanelWithAnimation = function() {
      if (!a11yPanel || a11yPanel.classList.contains('hidden') || a11yPanel.classList.contains('exiting')) return;
      a11yPanel.classList.add('exiting');
      setTimeout(() => {
        a11yPanel.classList.add('hidden');
        a11yPanel.classList.remove('exiting');
      }, 180);
    }

    window.toggleA11yPanel = function(e) {
      if (e) e.stopPropagation();
      if (!a11yPanel) return;
      if (a11yPanel.classList.contains('hidden')) {
        a11yPanel.classList.remove('hidden');
        a11yPanel.classList.remove('exiting');
      } else {
        window.closeA11yPanelWithAnimation();
      }
    }

    if (a11yBtn && a11yPanel) {
      a11yBtn.addEventListener('click', window.toggleA11yPanel);
      if (a11yCloseBtn) {
        a11yCloseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.closeA11yPanelWithAnimation();
        });
      }
      document.addEventListener('click', (e) => {
        if (!a11yPanel.contains(e.target) && !a11yBtn.contains(e.target)) {
          window.closeA11yPanelWithAnimation();
        }
      });
    }

    if (a11yContrastToggle) {
      a11yContrastToggle.addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
        const isActive = document.body.classList.contains('high-contrast');
        a11yContrastToggle.classList.toggle('active', isActive);
        const statusPill = document.getElementById('a11y-contrast-status');
        if (statusPill) statusPill.textContent = isActive ? 'ON' : 'OFF';
      });
    }

    if (a11yDyslexicToggle) {
      a11yDyslexicToggle.addEventListener('click', () => {
        document.body.classList.toggle('dyslexic-font');
        const isActive = document.body.classList.contains('dyslexic-font');
        a11yDyslexicToggle.classList.toggle('active', isActive);
        const statusPill = document.getElementById('a11y-dyslexic-status');
        if (statusPill) statusPill.textContent = isActive ? 'ON' : 'OFF';
      });
    }

    if (a11ySubtitlesToggle) {
      a11ySubtitlesToggle.addEventListener('click', () => {
        document.body.classList.toggle('large-subtitles');
        const isActive = document.body.classList.contains('large-subtitles');
        a11ySubtitlesToggle.classList.toggle('active', isActive);
        const statusPill = document.getElementById('a11y-subtitles-status');
        if (statusPill) statusPill.textContent = isActive ? 'ON' : 'OFF';
      });
    }

    // 8B. System Settings & Engine Preferences Modal (with AnimatePresence)
    const settingsBtn = document.getElementById('header-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const settingsClearCacheBtn = document.getElementById('settings-clear-cache-btn');

    window.openSettingsModal = function(e) {
      if (e) e.stopPropagation();
      if (!settingsModal) return;
      settingsModal.classList.remove('hidden');
      settingsModal.classList.remove('exiting');
      if (window.lucide) lucide.createIcons();
    }

    window.closeSettingsModalWithAnimation = function() {
      if (!settingsModal || settingsModal.classList.contains('hidden') || settingsModal.classList.contains('exiting')) return;
      settingsModal.classList.add('exiting');
      setTimeout(() => {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('exiting');
      }, 200);
    }

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', window.openSettingsModal);
      if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.closeSettingsModalWithAnimation();
        });
      }
      if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.closeSettingsModalWithAnimation();
        });
      }

      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          window.closeSettingsModalWithAnimation();
        }
      });
    }

    // 8C. Theme & Color Studio Engine (Light Mode, Custom Themes, Accent Picker)
    const themeModal = document.getElementById('theme-modal');
    
    window.toggleThemeModal = function(e) {
      if (e) e.stopPropagation();
      if (!themeModal) return;
      if (themeModal.classList.contains('hidden')) {
        themeModal.classList.remove('hidden');
        themeModal.classList.remove('exiting');
        if (window.lucide) lucide.createIcons();
      } else {
        window.closeThemeModalWithAnimation();
      }
    };

    window.closeThemeModalWithAnimation = function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!themeModal || themeModal.classList.contains('hidden') || themeModal.classList.contains('exiting')) return;
      themeModal.classList.add('exiting');
      setTimeout(() => {
        themeModal.classList.add('hidden');
        themeModal.classList.remove('exiting');
      }, 200);
    };

    window.setThemeMode = function(mode) {
      if (mode === 'dark') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', mode);
      }
      localStorage.setItem('omnisign-theme', mode);

      // Update UI active state on mode cards
      document.querySelectorAll('.theme-mode-card').forEach(card => {
        card.classList.toggle('active', card.dataset.mode === mode);
      });

      // Refresh icons inside theme modal
      if (window.lucide) lucide.createIcons();
    };

    window.setCustomAccent = function(hexColor) {
      if (!hexColor) return;
      
      // Calculate RGB for subtle glow and borders
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 255;
      const g = parseInt(hex.substring(2, 4), 16) || 255;
      const b = parseInt(hex.substring(4, 6), 16) || 255;

      document.documentElement.style.setProperty('--accent-color', hexColor);
      document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.35)`);
      document.documentElement.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, 0.12)`);
      document.documentElement.style.setProperty('--border-active', hexColor);

      localStorage.setItem('omnisign-accent', hexColor);

      // Update Hex display text and swatch buttons
      const hexDisplay = document.getElementById('custom-accent-hex');
      if (hexDisplay) hexDisplay.textContent = hexColor.toUpperCase();

      document.querySelectorAll('.accent-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color.toLowerCase() === hexColor.toLowerCase());
      });

      const colorPicker = document.getElementById('theme-color-picker');
      if (colorPicker && colorPicker.value !== hexColor) colorPicker.value = hexColor;
    };

    window.resetThemeToDefault = function() {
      window.setThemeMode('dark');
      window.setCustomAccent('#ffffff');
      localStorage.removeItem('omnisign-theme');
      localStorage.removeItem('omnisign-accent');
    };

    // Auto-restore saved theme preferences on startup
    const savedTheme = localStorage.getItem('omnisign-theme') || 'dark';
    const savedAccent = localStorage.getItem('omnisign-accent');
    window.setThemeMode(savedTheme);
    if (savedAccent) {
      window.setCustomAccent(savedAccent);
    }

    // Settings Pill Selectors (FPS, Hold Time, TTS Speed)
    document.querySelectorAll('#settings-fps-group .settings-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#settings-fps-group .settings-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.cameraFps = parseInt(pill.dataset.fps, 10) || 60;
      });
    });

    document.querySelectorAll('#settings-hold-group .settings-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#settings-hold-group .settings-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.gestureHoldTime = parseFloat(pill.dataset.hold) || 1.2;
      });
    });

    document.querySelectorAll('#settings-tts-speed-group .settings-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#settings-tts-speed-group .settings-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.ttsRate = parseFloat(pill.dataset.ttsSpeed) || 1.0;
      });
    });

    // Clear Cache Button
    if (settingsClearCacheBtn) {
      settingsClearCacheBtn.addEventListener('click', async () => {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
        const statusEl = document.getElementById('settings-cache-status');
        if (statusEl) {
          statusEl.textContent = 'Cache cleared successfully! Reloading dataset...';
          setTimeout(() => {
            statusEl.textContent = '146 sign media assets cached locally for offline telepresence';
          }, 2000);
        }
      });
    }

    // 9. Live Bridge Meeting Transcript Exporter
    const bridgeExportBtn = document.getElementById('bridge-export-btn');
    if (bridgeExportBtn) {
      bridgeExportBtn.addEventListener('click', () => {
        const msgs = document.querySelectorAll('#bridge-chat-feed .chat-msg');
        let transcriptContent = `=======================================================\n`;
        transcriptContent += `      OMNISIGN AI 2.0 - TELEPRESENCE MEETING TRANSCRIPT\n`;
        transcriptContent += `      Generated: ${new Date().toLocaleString()}\n`;
        transcriptContent += `=======================================================\n\n`;

        msgs.forEach((msg, idx) => {
          const sender = msg.classList.contains('speaker') ? 'VOCAL SPEAKER' : 'DEAF SIGNER';
          const time = msg.querySelector('.msg-header span')?.textContent || '';
          const text = msg.querySelector('.msg-text')?.textContent || '';
          transcriptContent += `[#${idx + 1}] [${time}] ${sender}:\n"${text}"\n\n`;
        });

        transcriptContent += `=======================================================\n`;
        transcriptContent += `End of Transcript. Signed via OmniSign Telepresence Room.\n`;

        const blob = new Blob([transcriptContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OmniSign_Meeting_Transcript_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // 10. S2V Landmark Theme Selector
    const meshPills = document.querySelectorAll('.mesh-pill');
    meshPills.forEach(pill => {
      pill.addEventListener('click', () => {
        meshPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        AppState.s2vMeshColor = pill.dataset.theme || 'emerald';
      });
    });

    // 11. Practice Accuracy Grader & Achievements Engine
    window.updatePracticeAccuracyMeter = function(score) {
      const accuracyCircle = document.getElementById('practice-accuracy-circle');
      const accuracyPct = document.getElementById('practice-accuracy-pct');
      if (accuracyCircle && accuracyPct) {
        const radius = 40;
        const circumference = 2 * Math.PI * radius; // 251.2
        const offset = circumference - (score / 100) * circumference;
        accuracyCircle.style.strokeDashoffset = offset;
        accuracyPct.textContent = `${Math.round(score)}%`;

        if (score >= 95) {
          accuracyCircle.style.stroke = '#22c55e';
          unlockPracticeBadge('badge-master-form');
        } else if (score >= 70) {
          accuracyCircle.style.stroke = '#eab308';
        } else {
          accuracyCircle.style.stroke = '#ef4444';
        }
      }
    };

    function unlockPracticeBadge(badgeId) {
      const b = document.getElementById(badgeId);
      if (b && !b.classList.contains('unlocked')) {
        b.classList.add('unlocked');
      }
    }

    // 12. FAQ Accordion Layout Morphing
    const faqCards = document.querySelectorAll('.faq-card');
    faqCards.forEach(card => {
      const trigger = card.querySelector('.faq-trigger');
      if (trigger) {
        trigger.addEventListener('click', () => {
          const isOpen = card.classList.contains('open');
          faqCards.forEach(c => {
            c.classList.remove('open');
            c.querySelector('.faq-trigger')?.setAttribute('aria-expanded', 'false');
          });
          if (!isOpen) {
            card.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      }
    });

    // Immediate trigger for above-the-fold hero elements
    setTimeout(() => {
      document.querySelectorAll('.landing-hero[data-motion]').forEach(el => {
        el.classList.add('motion-active');
        el.querySelectorAll('[data-counter]').forEach(c => animateNumberCounter(c));
      });
      updateNavDockIndicator();
    }, 100);
  }

  // Initialize Default State
  loadDictionary();
  pickRandomChallenge();
  initBridgeChatAndTimeline();
  initMotionEngine();
});

