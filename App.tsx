import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [circleColor, setCircleColor] = useState('#FFD700');
  const [backgroundColor, setBackgroundColor] = useState('#1E1E2F');
  const [extraCircles, setExtraCircles] = useState<{ id: number, type: 'score' | 'time' }[]>([]);
  const [circlesClicked, setCirclesClicked] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'veryHard'>('easy');
  const animatedValue = new Animated.Value(0);
  const bounceValue = new Animated.Value(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [circlePosition, setCirclePosition] = useState({ top: 50, left: 50 });

  async function playSound() {
    const { sound } = await Audio.Sound.createAsync(require('./assets/click.mp3'));
    setSound(sound);
    await sound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setGameStarted(false);
      triggerBounceAnimation();
      checkHighScore();
    }
    return () => clearInterval(timer);
  }, [gameStarted, timeLeft]);

  useEffect(() => {
    if (score > 0 && score % 10 === 0) {
      setTimeLeft((prevTime) => prevTime + 5); // Add 5 seconds every 10 points
    }
    if (score > 0 && score % 50 === 0) {
      const newCircles: { id: number; type: 'score' | 'time' }[] = Array.from({ length: score / 50 }, (_, i) => ({
        id: i,
        type: 'score'
      }));
      setExtraCircles(newCircles);
      setCirclesClicked(0);
    }
  }, [score]);

  useEffect(() => {
    loadHighScore();
  }, []);

  const handlePress = () => {
    if (!gameStarted || extraCircles.length > 0) return;
    setScore(score + 1);
    playSound();
    triggerAnimation();
    const { top, left } = getRandomPosition();
    setCirclePosition({ top, left });
  };

  const handleExtraCirclePress = (index: number, type: 'score' | 'time') => {
    setExtraCircles(extraCircles.filter((_, i) => i !== index));
    setCirclesClicked(circlesClicked + 1);
    if (type === 'score') {
      setScore(score + 10); // Extra points
    } else if (type === 'time') {
      setTimeLeft(timeLeft + 5); // Extra time
    }
  };

  const handleRestart = () => {
    setScore(0);
    setTimeLeft(difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : difficulty === 'hard' ? 10 : 5);
    setGameStarted(true);
    setCircleColor('#FFD700');
    setBackgroundColor('#1E1E2F');
    setExtraCircles([]);
    setCirclesClicked(0);
    setCirclePosition({ top: 50, left: 50 });
  };

  const handleStartGame = (selectedDifficulty: 'easy' | 'medium' | 'hard' | 'veryHard') => {
    setDifficulty(selectedDifficulty);
    setScore(0);
    setTimeLeft(selectedDifficulty === 'easy' ? 30 : selectedDifficulty === 'medium' ? 20 : selectedDifficulty === 'hard' ? 10 : 5);
    setGameStarted(true);
    setCircleColor('#FFD700');
    setBackgroundColor('#1E1E2F');
    setExtraCircles([]);
    setCirclesClicked(0);
    setCirclePosition({ top: 50, left: 50 });
  };

  const triggerAnimation = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 500,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerBounceAnimation = () => {
    Animated.sequence([
      Animated.timing(bounceValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
      Animated.timing(bounceValue, {
        toValue: 0,
        duration: 500,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const getRandomPosition = () => {
    const top = Math.random() * 60 + 30; // Random position between 30% and 90%
    const left = Math.random() * 80 + 10; // Random position between 10% and 90%
    return { top, left };
  };

  const animatedStyle = {
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.5],
        }),
      },
    ],
  };

  const bounceStyle = {
    transform: [
      {
        scale: bounceValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
    ],
  };

  const getCirclePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI;
    const radius = 30; // Distance from the center circle in percentage
    const top = 50 + radius * Math.sin(angle); // 50% from top + radius
    const left = 50 + radius * Math.cos(angle); // 50% from left + radius
    return { top, left };
  };

  const saveHighScore = async (score: number) => {
    try {
      await AsyncStorage.setItem('@highScore', score.toString());
    } catch (e) {
      console.error('Failed to save high score.', e);
    }
  };

  const loadHighScore = async () => {
    try {
      const value = await AsyncStorage.getItem('@highScore');
      if (value !== null) {
        setHighScore(parseInt(value, 10));
      }
    } catch (e) {
      console.error('Failed to load high score.', e);
    }
  };

  const checkHighScore = () => {
    if (score > highScore) {
      setHighScore(score);
      saveHighScore(score);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style="light" />
      {!gameStarted ? (
        <>
          {timeLeft === 0 && (
            <>
              <Animated.Text style={[styles.gameOverText, bounceStyle]}>Game Over</Animated.Text>
              <Animated.Text style={[styles.finalScore, bounceStyle]}>Score: {score}</Animated.Text>
              <Animated.Text style={[styles.highScore, bounceStyle]}>High Score: {highScore}</Animated.Text>
              <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
                <Text style={styles.restartButtonText}>Restart</Text>
              </TouchableOpacity>
            </>
          )}
          {timeLeft !== 0 && (
            <>
              <TouchableOpacity style={styles.startButton} onPress={() => handleStartGame(difficulty)}>
                <Text style={styles.startButtonText}>Start Game</Text>
              </TouchableOpacity>
              <View style={styles.difficultyContainer}>
                <TouchableOpacity onPress={() => setDifficulty('easy')}>
                  <Text style={styles.difficultyButton}>Easy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDifficulty('medium')}>
                  <Text style={styles.difficultyButton}>Medium</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDifficulty('hard')}>
                  <Text style={styles.difficultyButton}>Hard</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDifficulty('veryHard')}>
                  <Text style={styles.difficultyButton}>Very Hard</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <Text style={styles.title}> Tap Me </Text>
          <Text style={styles.timer}>Time Left: {timeLeft}s</Text>
          <View style={styles.gameArea}>
            <Animated.View style={[styles.scoreBox, animatedStyle, { backgroundColor: circleColor, top: `${circlePosition.top}%`, left: `${circlePosition.left}%`, position: 'absolute' }]}>
              <TouchableOpacity onPress={handlePress} style={styles.circleTouchable}>
                <Text style={styles.score}>{score}</Text>
              </TouchableOpacity>
            </Animated.View>
            {extraCircles.map((circle, index) => {
              const position = getCirclePosition(index, extraCircles.length);
              const size = 50; // Fixed size
              return (
                <TouchableOpacity
                  key={circle.id}
                  style={[styles.extraCircle, { backgroundColor: getRandomColor(), top: `${position.top}%`, left: `${position.left}%`, width: size, height: size, borderRadius: size / 2 }]}
                  onPress={() => handleExtraCirclePress(index, circle.type)}
                >
                  <Text style={styles.extraCircleText}>Tap</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    position: 'absolute',
    top: 160, // Updated from 40 to 60
  },
  timer: {
    fontSize: 24,
    color: '#FFD700',
    marginBottom: 20,
    position: 'absolute',
    top: 100, // Updated from 80 to 100
  },
  gameArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E1E2F',
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF4500',
    marginTop: 20,
  },
  finalScore: {
    fontSize: 24,
    color: '#FFD700',
    marginTop: 10,
  },
  highScore: {
    fontSize: 24,
    color: '#FFD700',
    marginTop: 10,
  },
  restartButton: {
    backgroundColor: '#FF4500',
    padding: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginTop: 20,
  },
  restartButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#32CD32',
    padding: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginTop: 20,
  },
  startButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  difficultyButton: {
    fontSize: 20,
    color: '#FFD700',
    padding: 10,
  },
  extraCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  extraCircleText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});