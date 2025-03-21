import { generateCode } from '../utils/anthropicApi';
import * as fs from 'fs/promises';

const prompts = {
  'ExerciseTracker.tsx': `*[Project Context]* [Instructions with Woebot/SuperBetter/Happify references] Create or update src/components/ExerciseTracker.tsx for *FaceVibe* to track 10 facial exercises with precise heuristics, display progress, and include face centering/distance detection: 
  1. Use navigator.mediaDevices.getUserMedia for a 640x480px <video> feed (teal #00C4B4 border glow, pulse animation) with constraints { video: { width: { ideal: 640 }, height: { ideal: 480 } } }.
  2. Integrate MediaPipe Face Mesh (CDN https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh) for 468 landmarks, targeting 25+ FPS (MacBook), 12+ FPS (mobile), with ‘Vibe Pulse’ animation.
  3. Face Centering: Detect face, calculate bounding box center (min/max x, y), compare to video center (320x240px). If >50px off, overlay a teal arrow (animated slide) and ‘Center your face, fam!’ (18px Arial, teal fade-in).
  4. Distance Detection: Measure face width (x_max - x_min), optimum range 300–400px. Overlay ‘Get closer, vibe star!’ (<300px) or ‘Back up a bit, glow boss!’ (>400px) with a pulse animation.
  5. Exercise Tracking with Heuristics and Progress: 
     - Render a <select> (teal border, border-teal rounded-md p-2 w-48 mx-auto block) with 10 exercises: Jaw Dropper, Brow Lifter, Cheek Puffer, Eye Winker, Smiley Stretch, Nose Scruncher, Lip Pucker, Chin Jutter, Forehead Smoother, Tongue Twister.
     - Track each exercise with precise heuristics (MediaPipe landmarks): Jaw Dropper: Chin (152) - top (0) > 20px, progress: (distance / 20) * 100%; Brow Lifter: Brow (107) - top (0) > 15px, progress: (distance / 15) * 100%; Cheek Puffer: Cheek width (234-454) > 25px, progress: (width / 25) * 100%; Eye Winker: Eye asymmetry (133-263 vs. 362-398) > 10px, progress: (asymmetry / 10) * 100%; Smiley Stretch: Mouth (61-291) > 30px, progress: (width / 30) * 100%; Nose Scruncher: Nose y-shift > 10px, progress: (shift / 10) * 100%; Lip Pucker: Lip z-shift > 10px, progress: (shift / 10) * 100%; Chin Jutter: Chin (152) forward > 15px, progress: (shift / 15) * 100%; Forehead Smoother: Wrinkles (y-variance) < 5px, progress: ((5 - variance) / 5) * 100%; Tongue Twister: Tongue below chin (152) > 5px, progress: (distance / 5) * 100%.
     - Display a progress bar below the video (w-full h-2 bg-gray-200 rounded, fill with bg-teal based on progress percentage, animate fill with transition-all).
     - On completion (100%), show feedback (e.g., ‘Jaw’s too elite!’ for Jaw Dropper, teal fade-in) and call onExerciseComplete prop.
  6. Overlay all feedback on a <canvas> (20px bold Arial, glossy slide-in).
  7. Include ‘Vibe Check’ spinner and error handling (‘Camera shy? Allow access!’).
  Use TypeScript with SWC, base path /facevibe/. Output the updated ExerciseTracker.tsx.`,

  'StressGame.tsx': `*[Project Context]* [Instructions with Woebot/SuperBetter/Happify references] Create or update src/components/StressGame.tsx for *FaceVibe* to detect stress and trigger 10 CBT mini-games: 
  1. Take MediaPipe landmark data as props from <ExerciseTracker>.
  2. Load a TensorFlow.js model from /public/model.json (<5MB, e.g., Mini-XCEPTION).
  3. Predict stress (0–1) every 1s; if >0.7, randomly trigger one of 10 CBT games: Smile Snipe: Mouth (61-291) > 30px for 30s, ‘Grin’s too posh for gremlins!’; Brow Chill: Brow movement < 10px for 30s, ‘Brows on vacay—stress canceled!’; Breath Blast: Placeholder, 30s, ‘Blast stress with air power!’; Eye Rest: Eyes closed (133-263, 362-398) for 5s, ‘Peepers napped—stress zapped!’; Jaw Jiggle: Jaw oscillates 10x in 30s (y-shift > 10px), ‘Wiggle master—tension’s toast!’; Positive Reframe: Mouth > 30px for 30s, ‘Zen boss mode—stress reframed!’; Cheek Drop: Cheek width < 20px for 30s, ‘Chipmunk vibes dropped—stress KO’d!’; Lip Loosen: No lip protrusion (z-shift < 5px) for 30s, ‘Lips too chill for vaults!’; Nose Flare: Nostril shift 5x in 30s (x-shift > 5px), ‘Nostril glow-up—blues flared out!’; Face Freeze: Neutral face (all shifts < 5px) for 15s, ‘Statue vibes—stress froze!’.
  4. Show a luxe modal (300x200px, teal-to-gold gradient, bg-gradient-to-r from-teal to-yellow-400 p-4 rounded-md) with a ‘Vibe Bar’ (teal-to-gold, h-2 bg-teal transition-all).
  5. End with ‘Stress got VIP-slapped!’ (win, teal burst) or ‘Stress sneaked the crown!’ (lose, red flicker).
  Include cleanup for model/timer on unmount. Use TypeScript with SWC, base path /facevibe/. Output the updated StressGame.tsx.`,

  'ResilienceTracker.tsx': `*[Project Context]* [Instructions with Woebot/SuperBetter/Happify references] Create or update src/components/ResilienceTracker.tsx for *FaceVibe* to track resilience: 
  1. Take exerciseCount (0–10) and stress (0–1) as props.
  2. Calculate resilience = (exerciseCount * 10) - (stress * 5).
  3. Store daily data in localStorage (resilience_data) as { date: 'YYYY-MM-DD', exercises, stress }.
  4. Display ‘Resilience: X—Stress is shaking in its boots!’ (X > 50) or ‘Resilience: X—Keep flexing, champ!’ (X ≤ 50) in 24px bold Arial (text-2xl font-bold text-teal text-center).
  5. Render a 7-day Chart.js line chart (300x150px, teal line, w-[300px] h-[150px] mx-auto).
  Include error handling for missing data (‘No flex yet—start exercising!’). Use TypeScript with SWC, base path /facevibe/. Output the updated ResilienceTracker.tsx.`,

  'SocialStreaks.tsx': `*[Project Context]* [Instructions with Woebot/SuperBetter/Happify references] Create or update src/components/SocialStreaks.tsx for *FaceVibe* to display streaks: 
  1. Take exerciseDoneToday (boolean) as a prop.
  2. Track streak in localStorage (my_streak): +1 if exerciseDoneToday and consecutive, 0 if missed.
  3. Hardcode friends: [{ name: 'Alex', streak: 5 }, { name: 'Jamie', streak: 3 }].
  4. Render a 300px-wide list (w-[300px] mx-auto space-y-2): ‘You: X days—Streak star!’ (teal, if X > 5, text-teal) or ‘You: X days’ (black), ‘Alex: 5 days’, ‘Jamie: 3 days’ in 18px Arial (text-lg).
  Include date logic and error handling. Use TypeScript with SWC, base path /facevibe/. Output the updated SocialStreaks.tsx.`,

  'App.tsx': `*[Project Context]* [Instructions with Woebot/SuperBetter/Happify references] Create or update src/App.tsx for *FaceVibe* to integrate all components with a responsive layout: 
  1. Import <ExerciseTracker>, <StressGame>, <ResilienceTracker>, <SocialStreaks>, and <TrainerChat> from src/components.
  2. Use useState for exerciseCount: number (0–10), stressLevel: number (0–1), exerciseDoneToday: boolean, showSidebar: boolean (default false), exerciseProgress: number (0–100), and currentExercise: string.
  3. Pass landmarks from <ExerciseTracker> to <StressGame>, update state on exercise/game completion (onExerciseComplete increments exerciseCount, setExerciseDoneToday(true)).
  4. Feed state to <ResilienceTracker> and <SocialStreaks>, pass exerciseProgress and currentExercise to <TrainerChat>.
  5. Responsive Layout (Tailwind CSS):
     - Web (>600px, md breakpoint): <h1>FaceVibe</h1> (18px Arial, teal #00C4B4, text-teal text-lg font-bold text-center mb-4), 640x480px <video> from <ExerciseTracker> centered (mx-auto), <StressGame> modal centered (absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2), <div className="flex justify-between w-full max-w-5xl mx-auto mt-4"> with <StressLevel> (w-1/4 p-4 bg-gray-100 rounded-md) left, <Benefits> (w-1/4 p-4 bg-gray-100 rounded-md) right, below <ResilienceTracker> and <SocialStreaks> in a centered 300px column (w-[300px] mx-auto space-y-4 mt-4), <TrainerChat> below (w-[300px] mx-auto mt-4).
     - Mobile (<600px): Vertical stack (flex flex-col items-center space-y-4) with video, <ResilienceTracker>, <SocialStreaks>, <TrainerChat>, toggle button (md:hidden p-2 bg-teal text-white rounded-md) to show/hide <StressLevel> and <Benefits> (hidden md:block, toggle with showSidebar), display toggled elements (flex flex-col space-y-4).
  6. Add a ‘Start FaceVibe’ button (‘Vibe up your face, fam!’, teal, bg-teal text-white rounded-md p-2 mt-4) to reset state.
  Include try-catch for webcam failure (‘FaceVibe needs your face—allow camera!’). Use TypeScript with SWC, base path /facevibe/. Output the updated App.tsx.`,

  'TrainerChat.tsx': `*[Project Context]* [Instructions with Woebot/SuperBetter/Happify references] Create src/components/TrainerChat.tsx for *FaceVibe* to implement a gym trainer chatbot using the Claude API: 
  1. Import @anthropic-ai/sdk and use process.env.ANTHROPIC_API_KEY.
  2. Use useState for chatMessages: { role: 'user' | 'assistant', content: string }[] and input: string.
  3. Take exerciseProgress (0–100%) and currentExercise (e.g., ‘Jaw Dropper’) as props from <ExerciseTracker>.
  4. Implement a chat interface: <textarea> (teal border, border-teal rounded-md p-2 w-full max-w-md) for user input, ‘Send’ button (teal, bg-teal text-white rounded-md p-2) to submit, chat log (w-full max-w-md bg-gray-100 p-2 rounded-md space-y-2) displaying messages (user in black, assistant in teal).
  5. Use the Claude API to generate responses: System prompt: ‘You are a motivational gym trainer with a Gen Z vibe for *FaceVibe*, guiding users through 10 facial exercises: Jaw Dropper (>20px), Brow Lifter (>15px), Cheek Puffer (>25px), Eye Winker (>10px asymmetry), Smiley Stretch (>30px), Nose Scruncher (>10px y-shift), Lip Pucker (>10px z-shift), Chin Jutter (>15px), Forehead Smoother (<5px variance), Tongue Twister (>5px). Encourage progress (e.g., ‘Yo, fam, 75% on Jaw Dropper—slay it!’) and suggest next steps.’ User message: Combine input and progress (e.g., ‘User: How’s my Jaw Dropper? Progress: 75%’). Call anthropic.messages.create with model ‘claude-3-5-sonnet-20240620’, max_tokens 300.
  6. Display real-time feedback based on exerciseProgress (e.g., ‘Keep goin’, champ—90% to go!’) without user input if progress changes.
  7. Include error handling (‘Trainer’s mic broke—try again!’).
  Use TypeScript with SWC, Tailwind CSS, base path /facevibe/. Output the updated TrainerChat.tsx.`
};

async function generateFiles() {
  for (const [fileName, prompt] of Object.entries(prompts)) {
    const code = await generateCode(prompt);
    await fs.writeFile(`src/components/${fileName}`, code);
    console.log(`Generated ${fileName}`);
  }
}

generateFiles().catch(console.error);