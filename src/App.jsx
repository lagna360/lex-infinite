import { useState, useEffect } from 'react';
import './App.css';
import wordListText from '/combined.txt?raw';

const STORAGE_KEY = 'lexinfinite_scores';

function App() {
  // Audio setup
  const victorySound = new Audio('/sounds/victory.mp3');
  const gameoverSound = new Audio('/sounds/gameover.mp3');

  // state variables
  const [words, setWords] = useState([]);
  const [dictionaryLoaded, setDictionaryLoaded] = useState(false);
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [targetWord, setTargetWord] = useState('');
  const [keyboardState, setKeyboardState] = useState({});
  const INITIAL_TIME = 300; // 5 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [timerActive, setTimerActive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [scores, setScores] = useState([]);
  const maxGuesses = 6;
  const wordLength = 5;

  // SET DYNAMIC VH (for mobile Safari and other mobile devices)
  useEffect(() => {
    function setVh() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  // Score saving functions
  const saveScore = () => {
    const score = {
      date: new Date().toISOString(),
      word: targetWord,
      guesses: guesses.length,
      timeLeft,
      won: currentGuess === targetWord,
      timeout: false
    };
    const updatedScores = [...scores, score];
    setScores(updatedScores);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScores));
  };

  const clearScores = () => {
    setScores([]);
    localStorage.removeItem(STORAGE_KEY);
    setShowStats(false);
  };

  const getGuessResult = (guess) => {
    // Create an array to store each letter's result: default to 'absent'
    let result = Array(guess.length).fill('absent');
    // Convert targetWord to an array so we can "consume" letters as they are matched
    let targetArr = targetWord.split('');
  
    // First pass: mark all correct letters (green)
    for (let i = 0; i < guess.length; i++) {
      if (guess[i] === targetWord[i]) {
        result[i] = 'correct';
        targetArr[i] = null; // Remove this letter so it cannot be reused
      }
    }
  
    // Second pass: mark present letters (yellow) only if they exist in remaining targetArr
    for (let i = 0; i < guess.length; i++) {
      if (result[i] !== 'correct') {
        const letterIndex = targetArr.indexOf(guess[i]);
        if (letterIndex > -1) {
          result[i] = 'present';
          targetArr[letterIndex] = null; // Remove to prevent duplicate matches
        }
      }
    }
    
    return result;
  };

  const generateScoreImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = window.devicePixelRatio;

    // Set canvas size
    canvas.width = 300 * scale;
    canvas.height = 400 * scale;
    ctx.scale(scale, scale);

    // Set background
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set title
    ctx.fillStyle = '#00ff9f';
    ctx.font = 'bold 20px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('LEXINFINITE', 150, 40);

    // Draw current game grid
    const gridSize = 30;
    const startX = 75;
    const startY = 80;

    guesses.forEach((guess, row) => {
      [...guess].forEach((letter, col) => {
        const x = startX + col * (gridSize + 5);
        const y = startY + row * (gridSize + 5);

        // Draw cell background
        ctx.fillStyle = getBackgroundColor(letter, col, guess);
        ctx.fillRect(x, y, gridSize, gridSize);

        // Draw border
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x, y, gridSize, gridSize);
      });
    });

    // Add score info
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Orbitron';
    ctx.fillText(`Guesses: ${guesses.length}/6`, 150, 320);
    ctx.fillText(`Time Left: ${timeLeft}s`, 150, 350);

    return canvas.toDataURL('image/png');
  };

  const getBackgroundColor = (letter, col, guess) => {
    const status = getLetterStatus(letter, col, guess);
    if (status === 'correct') return '#00ff9f';
    if (status === 'present') return '#ffff00';
    return '#333333';
  };

  const shareScores = async () => {
    try {
      const scoreImage = await generateScoreImage();

      // Prepare share data
      const shareData = {
        title: 'LEXINFINITE Score',
        text: `LEXINFINITE ${guesses.length}/6\n${timeLeft}s remaining`,
        files: [new File([dataURLtoBlob(scoreImage)], 'lexinfinite-score.png', { type: 'image/png' })]
      };

      // Check if native share is available
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        const shareText = `LEXINFINITE ${guesses.length}/6\n${timeLeft}s remaining\n\n` +
          guesses.map(guess =>
            [...guess].map(letter => {
              if (letter === targetWord[guess.indexOf(letter)]) return '🟩';
              if (targetWord.includes(letter)) return '🟨';
              return '⬛';
            }).join('')
          ).join('\n');

        await navigator.clipboard.writeText(shareText);
        alert('Score copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Could not share score. Score copied to clipboard instead.');
    }
  };

  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const resetGame = () => {
    if (!dictionaryLoaded || !words || words.length === 0) {
      console.error('Cannot reset game: dictionary not loaded');
      return;
    }

    // Select random word safely
    const randomIndex = Math.floor(Math.random() * words.length);
    const randomWord = words[randomIndex];

    if (!randomWord) {
      console.error('Failed to select random word');
      return;
    }

    const upperWord = randomWord.toUpperCase();
    console.log('🎯 Target Word:', upperWord);

    setTargetWord(upperWord);
    setCurrentGuess('');
    setGuesses([]);
    setGameOver(false);
    setKeyboardState({});
    setTimeLeft(INITIAL_TIME);
    setTimerActive(false);
    setShowStats(false);
  };

  // Load words and saved scores on mount
  useEffect(() => {
    const loadWords = async () => {
      try {
        // Load saved scores
        const savedScores = localStorage.getItem(STORAGE_KEY);
        if (savedScores) {
          setScores(JSON.parse(savedScores));
        }

        // Load word list from imported text
        if (!wordListText) {
          throw new Error('Empty dictionary file');
        }

        // Process word list
        const wordList = wordListText
          .split('\n')
          .map(word => word?.trim())
          .filter(Boolean)
          .filter(word => word.length === 5)
          .map(word => word.toLowerCase());

        if (wordList.length === 0) {
          throw new Error('No valid words found in dictionary');
        }

        // First set the words list
        setWords(wordList);
        console.log(`Loaded ${wordList.length} words`);

        // Verify we have a valid word list before proceeding
        if (!Array.isArray(wordList) || wordList.length === 0) {
          throw new Error('Word list is not valid');
        }

        // Log the first few words to verify content
        console.log('First few words:', wordList.slice(0, 5));
        console.log('Total words:', wordList.length);

        // Then safely select a random word
        try {
          // Ensure we have a valid index
          const maxIndex = wordList.length - 1;
          const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
          
          if (randomIndex < 0 || randomIndex >= wordList.length) {
            throw new Error(`Invalid random index: ${randomIndex} for length ${wordList.length}`);
          }

          const randomWord = wordList[randomIndex];
          if (typeof randomWord !== 'string' || randomWord.length !== 5) {
            throw new Error(`Invalid word selected: ${randomWord}`);
          }
          
          const upperWord = randomWord.toUpperCase();
          console.log('🎯 Target Word:', upperWord);
          setTargetWord(upperWord);
          
          // Only enable the game if we successfully set everything up
          setDictionaryLoaded(true);
        } catch (error) {
          console.error('Error selecting random word:', error);
          throw new Error(`Failed to initialize game: ${error.message}`);
        }
      } catch (error) {
        console.error('Dictionary loading error:', error);
        alert(`Failed to load dictionary: ${error.message}`);
      }
    };

    loadWords();
  }, []);

  // Timer effect
  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0 && !gameOver) {
      timer = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setGameOver(true);
            // Play game over sound for timeout
            gameoverSound.currentTime = 0;
            gameoverSound.play().catch(err => console.log('Sound play failed:', err));
            const score = {
              date: new Date().toISOString(),
              word: targetWord,
              guesses: guesses.length,
              timeLeft: 0,
              won: false,
              timeout: true
            };
            const updatedScores = [...scores, score];
            setScores(updatedScores);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScores));
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft, gameOver, scores, targetWord, guesses]);

  const updateKeyboardState = (guess) => {
    const newState = { ...keyboardState };
    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const currentStatus = getLetterStatus(letter, i, guess);
      if (!newState[letter] || (currentStatus === 'correct') || (currentStatus === 'present' && newState[letter] === 'absent')) {
        newState[letter] = currentStatus;
      }
    }
    setKeyboardState(newState);
  };

  const [invalidGuess, setInvalidGuess] = useState(false);

  const handleKeyPress = (key) => {
    if (gameOver || !dictionaryLoaded) return;

    if (key === 'ENTER') {
      if (currentGuess.length !== wordLength) return;

      // Extra validation and logging
      if (!dictionaryLoaded) {
        console.log('Dictionary not loaded yet');
        return;
      }

      const guessLower = currentGuess.toLowerCase();
      console.log('Validating word:', guessLower);
      console.log('Dictionary loaded:', dictionaryLoaded);
      console.log('Dictionary size:', words.length);

      if (!words.includes(guessLower)) {
        console.log('Invalid word:', guessLower);
        setInvalidGuess(true);
        setTimeout(() => setInvalidGuess(false), 600);
        return;
      }
      console.log('Valid word:', guessLower);
      const newGuesses = [...guesses, currentGuess];
      updateKeyboardState(currentGuess);
      setGuesses(newGuesses);
      setCurrentGuess('');

      // Start timer after first word is entered
      if (guesses.length === 0) {
        setTimerActive(true);
      }

      const isWin = currentGuess === targetWord;
      if (isWin || newGuesses.length >= maxGuesses) {
        setGameOver(true);

        // Play appropriate sound
        if (isWin) {
          victorySound.currentTime = 0;
          victorySound.play().catch(err => console.log('Sound play failed:', err));
        } else {
          gameoverSound.currentTime = 0;
          gameoverSound.play().catch(err => console.log('Sound play failed:', err));
        }

        saveScore();
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < wordLength && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
    }
  };


  const getLetterStatus = (letter, index, guess) => {
    const results = getGuessResult(guess);
    return results[index];
  };

  const getKeyClass = (key) => {
    const status = keyboardState[key];
    let baseClass = 'key';
    if (status) {
      baseClass += ' ' + status;
    }
    return baseClass;
  };

  // Listen for keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleKeyPress('ENTER');
      } else if (e.key === 'Backspace') {
        handleKeyPress('BACKSPACE');
      } else {
        const key = e.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) {
          handleKeyPress(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameOver]);

  return (
    // The top‑level container uses the dynamic vh variable.
    <div className="bg-cyber-background app-container">
      {/* Spacer element to allow vertical scroll (and trigger address bar auto‑hide) */}
      <div className="spacer" />
      <div className="game-container scale-with-height pt-16 pb-16">
        <header className="header-container flex items-center justify-between px-2">
          <div className="h-8 px-3 text-xl font-bold text-cyber-primary animate-glow text-center font-mono border border-cyber-primary rounded flex items-center justify-center">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>

          <h1 className="text-2xl font-bold font-cyber animate-glow flex items-center justify-center gap-1">
            <span className="text-cyber-primary">LEX</span>
            <span className="text-cyber-accent animate-pulse">∞</span>
            <span className="text-cyber-primary">INFINITE</span>
          </h1>

          <button
            onClick={() => setShowStats(!showStats)}
            className="w-8 h-8 bg-cyber-surface text-cyber-primary border border-cyber-primary rounded hover:bg-cyber-primary hover:text-cyber-background transition-colors flex items-center justify-center"
          >
            <span className="text-lg">📊</span>
          </button>
        </header>

        <main className="content-spacing">
          {!dictionaryLoaded ? (
            <div className="text-cyber-primary text-center py-4 animate-pulse">
              Loading dictionary...
            </div>
          ) : (
            <div className="game-board-container">
              <div className="w-full">
                {showStats ? (
                  <div className="w-full space-y-2">
                    <h2 className="text-2xl font-bold text-cyber-primary text-center mb-4">Your Stats</h2>
                    <div className="overflow-y-auto custom-scrollbar" style={{ height: 'calc(var(--game-area-height) - 4rem)' }}>
                      {scores.length === 0 ? (
                        <p className="text-gray-400 text-center">No games played yet</p>
                      ) : (
                        <div className="space-y-2">
                          {scores.map((score, index) => (
                            <div key={index} className="bg-cyber-surface/50 p-3 rounded">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-cyber-primary font-mono text-lg">{score.word}</span>
                                <span className={`${score.won ? 'text-green-500' : score.timeout ? 'text-yellow-500' : 'text-red-500'} font-mono`}>
                                  {score.won ? 'Won' : score.timeout ? 'Timeout' : 'Lost'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400/80 font-cyber">
                                {new Date(score.date).toLocaleDateString()} · {score.guesses} guesses · {score.timeLeft}s left
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : !gameOver ? (
                  <>
                    {/* Previous guesses */}
                    {guesses.map((guess, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2">
                        {guess.split('').map((letter, j) => (
                          <div
                            key={j}
                            className={`game-tile ${getLetterStatus(letter, j, guess)} flip-in`}
                          >
                            {letter}
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Current guess */}
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: wordLength }).map((_, i) => (
                        <div
                          key={i}
                          className={`game-tile ${i < currentGuess.length ? 'filled pop-in' : ''} ${invalidGuess && i < currentGuess.length ? 'jiggle' : ''}`}
                        >
                          {currentGuess[i] || ''}
                        </div>
                      ))}
                    </div>

                    {/* Empty rows */}
                    {Array.from({ length: maxGuesses - guesses.length - 1 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-5 gap-2">
                        {Array.from({ length: wordLength }).map((_, j) => (
                          <div key={j} className="game-tile">
                            {''}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className={`relative text-center p-8 rounded-lg shadow-neon animate-fade-in my-auto ${guesses[guesses.length - 1] === targetWord ? 'victory-container cyber' : 'bg-cyber-background-light border-2 border-cyber-primary'}`}>
                    {guesses[guesses.length - 1] === targetWord && (
                      <>
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="star" />
                        ))}
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-4xl">🎉</div>
                        <div className="absolute -top-4 right-4 text-4xl">🏆</div>
                        <div className="absolute -top-4 left-4 text-4xl">⭐</div>
                      </>
                    )}
                    <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${guesses[guesses.length - 1] === targetWord ? 'victory-title' : 'text-cyber-primary'}`}>
                      {timeLeft === 0 ? "Time's Up!" : guesses[guesses.length - 1] === targetWord ? "AWESOME!" : "Game Over!"}
                    </h2>
                    {guesses[guesses.length - 1] === targetWord ? (
                      <>
                        <p className="text-2xl text-cyber-primary mb-4" style={{ animation: 'bounce 1s ease-in-out 2' }}>You're Amazing! 🌟</p>
                        <p className="text-xl text-cyber-accent mb-6">
                          Solved <span className="font-bold text-cyber-primary">{targetWord}</span> in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl text-cyber-secondary mb-6">
                          The word was: <span className="font-bold text-cyber-primary">{targetWord}</span>
                        </p>
                        <div className="text-cyber-secondary">
                          {timeLeft === 0 ? (
                            <p>Time ran out after {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}</p>
                          ) : (
                            <p>Better luck next time!</p>
                          )}
                        </div>
                      </>
                    )}
                    <button
                      onClick={resetGame}
                      className={`mt-6 px-6 py-2 bg-cyber-background border-2 font-cyber rounded-md transition-all duration-200 ${guesses[guesses.length - 1] === targetWord ? 'border-cyber-accent text-cyber-accent hover:bg-cyber-accent hover:text-cyber-background hover:scale-105' : 'border-cyber-primary text-cyber-primary hover:bg-cyber-primary hover:text-cyber-background hover:scale-105'}`}
                    >
                      Play Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Keyboard / Stats buttons */}
        {showStats ? (
          <div className="keyboard-area">
            <div className="stats-buttons">
              <button
                onClick={clearScores}
                className="px-4 py-2 bg-red-900/90 text-white rounded hover:bg-red-800 transition-colors whitespace-nowrap min-w-[90px] text-sm font-cyber"
              >
                Clear All
              </button>
              <button
                onClick={shareScores}
                className="px-4 py-2 bg-cyber-surface text-cyber-primary border border-cyber-primary rounded hover:bg-cyber-primary hover:text-cyber-background transition-colors whitespace-nowrap min-w-[90px] text-sm font-cyber"
              >
                Share
              </button>
              <button
                onClick={() => {
                  setShowStats(false);
                  resetGame();
                }}
                className="px-4 py-2 bg-gray-700/90 text-white rounded hover:bg-gray-600 transition-colors whitespace-nowrap min-w-[90px] text-sm font-cyber"
              >
                New Game
              </button>
            </div>
          </div>
        ) : !gameOver && (
          <div className="keyboard-area scale-keyboard">
            {[
              ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
              ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
              ['↵', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
            ].map((row, i) => (
              <div key={i} className="keyboard-row">
                {row.map(key => {
                  const isEnter = key === '↵';
                  const isBackspace = key === '⌫';
                  const displayKey = isEnter ? 'ENTER' : isBackspace ? 'BACKSPACE' : key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(isEnter ? 'ENTER' : isBackspace ? 'BACKSPACE' : key)}
                      className={`key ${getKeyClass(key)} ${isEnter ? 'enter-key' : isBackspace ? 'backspace-key' : ''}`}
                      data-key={key}
                      aria-label={displayKey}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;