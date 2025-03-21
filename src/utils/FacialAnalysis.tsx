/**
 * FacialAnalysis.ts
 * 
 * This utility provides heuristic-based facial analysis functions for:
 * 1. Stress detection based on facial expressions
 * 2. Validation of specific facial exercises
 */

// Enhanced landmark indices for facial features
const FACIAL_LANDMARKS = {
    // Eyes
    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,
    LEFT_EYE_OUTER: 33,
    LEFT_EYE_INNER: 133,
    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,
    RIGHT_EYE_OUTER: 263,
    RIGHT_EYE_INNER: 362,
    
    // Eyebrows
    LEFT_EYEBROW_OUTER: 70,
    LEFT_EYEBROW: 107,
    LEFT_EYEBROW_INNER: 105,
    RIGHT_EYEBROW_OUTER: 300,
    RIGHT_EYEBROW: 336,
    RIGHT_EYEBROW_INNER: 334,
    
    // Mouth
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
    UPPER_LIP: 13,
    LOWER_LIP: 14,
    UPPER_LIP_TOP: 0,
    LOWER_LIP_BOTTOM: 17,
    
    // Face structure
    NOSE_TIP: 4,
    NOSE_BRIDGE: 6,
    NOSE_LEFT: 285,
    NOSE_RIGHT: 55,
    CHIN: 152,
    CHIN_LEFT: 149,
    CHIN_RIGHT: 378,
    FOREHEAD_TOP: 10,
    FOREHEAD_MID: 151,
    
    // Cheeks
    LEFT_CHEEK: 234,
    RIGHT_CHEEK: 454,
    LEFT_CHEEK_OUTER: 206,
    RIGHT_CHEEK_OUTER: 426,
    
    // Jaw
    JAW_LEFT: 207,
    JAW_RIGHT: 427,
    JAW_CENTER: 200
};

/**
 * Calculate stress level based on facial features
 * Returns a value between 0-1 where higher values indicate more stress
 * Enhanced with additional biometric indicators
 */
export function calculateStressLevel(landmarks: any): number {
  if (!landmarks) return 0.5; // Default neutral value if landmarks are unavailable
  
  // Gather key metrics that correlate with stress
  
  // 1. Measure eyebrow contraction (knitted brows indicate stress)
  const leftBrowInner = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW_INNER];
  const rightBrowInner = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW_INNER];
  const leftBrowOuter = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW_OUTER];
  const rightBrowOuter = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW_OUTER];
  const noseBridge = landmarks[FACIAL_LANDMARKS.NOSE_BRIDGE];
  
  // Calculate vertical position of brows relative to nose bridge
  const browPinchFactor = Math.abs(
    (leftBrowInner.y - noseBridge.y) + (rightBrowInner.y - noseBridge.y)
  ) / 2;
  
  // Calculate brow asymmetry (can indicate tension)
  const browAsymmetry = Math.abs(
    (leftBrowOuter.y - leftBrowInner.y) - (rightBrowOuter.y - rightBrowInner.y)
  );
  
  // 2. Measure mouth tension (tight lips indicate stress)
  const mouthLeft = landmarks[FACIAL_LANDMARKS.MOUTH_LEFT];
  const mouthRight = landmarks[FACIAL_LANDMARKS.MOUTH_RIGHT];
  const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
  const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
  
  // Horizontal mouth width
  const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
  
  // Vertical mouth openness
  const mouthOpenness = Math.abs(upperLip.y - lowerLip.y);
  
  // Lip compression (tight lips)
  const lipCompression = Math.min(0.05, mouthOpenness) / 0.05;
  
  // 3. Measure eye openness (wide eyes can indicate stress/fear)
  const leftEyeOpening = Math.abs(
    landmarks[FACIAL_LANDMARKS.LEFT_EYE_TOP].y - 
    landmarks[FACIAL_LANDMARKS.LEFT_EYE_BOTTOM].y
  );
  const rightEyeOpening = Math.abs(
    landmarks[FACIAL_LANDMARKS.RIGHT_EYE_TOP].y - 
    landmarks[FACIAL_LANDMARKS.RIGHT_EYE_BOTTOM].y
  );
  const eyeOpenness = (leftEyeOpening + rightEyeOpening) / 2;
  
  // Eye widening factor (both very wide and very narrow eyes can indicate stress)
  const eyeWidenFactor = Math.abs(eyeOpenness - 0.03) * 10;
  
  // Eye asymmetry (can indicate tension)
  const eyeAsymmetry = Math.abs(leftEyeOpening - rightEyeOpening) * 10;
  
  // 4. Forehead smoothness (wrinkles indicate stress)
  const foreheadTop = landmarks[FACIAL_LANDMARKS.FOREHEAD_TOP];
  const foreheadMid = landmarks[FACIAL_LANDMARKS.FOREHEAD_MID];
  const foreheadVariation = Math.abs(foreheadTop.y - foreheadMid.y);
  
  // 5. Jaw tension (tight jaw indicates stress)
  const jawLeft = landmarks[FACIAL_LANDMARKS.JAW_LEFT];
  const jawRight = landmarks[FACIAL_LANDMARKS.JAW_RIGHT];
  const jawCenter = landmarks[FACIAL_LANDMARKS.JAW_CENTER];
  
  // Jaw clenching approximation
  const jawWidth = Math.abs(jawLeft.x - jawRight.x);
  const jawHeight = Math.abs(jawCenter.y - landmarks[FACIAL_LANDMARKS.CHIN].y);
  const jawClenchFactor = (jawWidth / jawHeight) - 2.0;
  
  // 6. Nose flaring (can indicate stress/anxiety)
  const noseLeft = landmarks[FACIAL_LANDMARKS.NOSE_LEFT];
  const noseRight = landmarks[FACIAL_LANDMARKS.NOSE_RIGHT];
  const noseWidth = Math.abs(noseLeft.x - noseRight.x);
  const noseFlaring = Math.max(0, (noseWidth - 0.15) * 5);
  
  // Normalize and combine factors with appropriate weights based on research
  
  // Inverted mouth width - smaller width = higher stress
  const mouthFactor = 1 - Math.min(1, mouthWidth * 3.5);
  
  // Higher eyebrow contraction = higher stress
  const eyebrowFactor = Math.min(1, (1 - browPinchFactor) * 5 + browAsymmetry * 3);
  
  // Extreme eye openness or asymmetry = higher stress
  const eyeFactor = Math.min(1, eyeWidenFactor * 0.7 + eyeAsymmetry * 0.3);
  
  // Higher forehead variation = higher stress
  const foreheadFactor = Math.min(1, foreheadVariation * 15);
  
  // Jaw clenching = higher stress
  const jawFactor = Math.min(1, Math.max(0, jawClenchFactor * 2));
  
  // Lip compression = higher stress
  const lipFactor = 1 - lipCompression;
  
  // Combine all factors with weights based on research-backed indicators
  let stressLevel = 
    (mouthFactor * 0.20) + 
    (eyebrowFactor * 0.25) + 
    (eyeFactor * 0.15) + 
    (foreheadFactor * 0.15) +
    (jawFactor * 0.15) +
    (lipFactor * 0.05) +
    (noseFlaring * 0.05);
  
  // Add a small random factor for natural variation (reduced for more stability)
  stressLevel = stressLevel * 0.95 + Math.random() * 0.05;
  
  // Ensure the value is between 0-1
  return Math.min(1, Math.max(0, stressLevel));
}

/**
 * Exercise validation functions
 * Each returns true if the exercise is performed correctly
 * Enhanced with more precise measurements and thresholds
 */
export const ExerciseValidators = {
  /**
   * Jaw Dropper: Check if jaw is dropped enough
   */
  jawDropper: (landmarks: any): boolean => {
    const chin = landmarks[FACIAL_LANDMARKS.CHIN];
    const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
    const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
    const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
    
    // Measure vertical distance between chin and nose
    const jawDrop = Math.abs(chin.y - noseTip.y);
    
    // Measure mouth opening
    const mouthOpening = Math.abs(upperLip.y - lowerLip.y);
    
    // Return true if jaw is dropped sufficiently AND mouth is open
    return jawDrop > 0.22 && mouthOpening > 0.05;
  },
  
  /**
   * Brow Lifter: Check if eyebrows are raised
   */
  browLifter: (landmarks: any): boolean => {
    const leftBrowOuter = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW_OUTER];
    const leftBrowInner = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW_INNER];
    const rightBrowOuter = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW_OUTER];
    const rightBrowInner = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW_INNER];
    const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
    
    // Calculate average eyebrow height relative to nose
    const leftBrowHeight = (noseTip.y - leftBrowOuter.y + noseTip.y - leftBrowInner.y) / 2;
    const rightBrowHeight = (noseTip.y - rightBrowOuter.y + noseTip.y - rightBrowInner.y) / 2;
    const browHeight = (leftBrowHeight + rightBrowHeight) / 2;
    
    // Check for symmetry (both eyebrows should be raised)
    const symmetry = Math.abs(leftBrowHeight - rightBrowHeight) < 0.03;
    
    // Return true if brows are lifted enough and relatively symmetrical
    return browHeight > 0.15 && symmetry;
  },
  
  /**
   * Cheek Puffer: Check if cheeks are puffed out
   */
  cheekPuffer: (landmarks: any): boolean => {
    const leftCheek = landmarks[FACIAL_LANDMARKS.LEFT_CHEEK];
    const rightCheek = landmarks[FACIAL_LANDMARKS.RIGHT_CHEEK];
    const leftCheekOuter = landmarks[FACIAL_LANDMARKS.LEFT_CHEEK_OUTER];
    const rightCheekOuter = landmarks[FACIAL_LANDMARKS.RIGHT_CHEEK_OUTER];
    
    // Measure the width between cheeks
    const cheekWidth = Math.abs(leftCheek.x - rightCheek.x);
    
    // Measure cheek protrusion (z-axis)
    const leftProtrusion = leftCheek.z - leftCheekOuter.z;
    const rightProtrusion = rightCheek.z - rightCheekOuter.z;
    const cheekProtrusion = (leftProtrusion + rightProtrusion) / 2;
    
    // Return true if cheeks are puffed enough (wide and protruding)
    return cheekWidth > 0.25 && cheekProtrusion < -0.01;
  },
  
  /**
   * Eye Winker: Check for asymmetrical eye closure (winking)
   */
  eyeWinker: (landmarks: any): boolean => {
    const leftEyeOpening = Math.abs(
      landmarks[FACIAL_LANDMARKS.LEFT_EYE_TOP].y - 
      landmarks[FACIAL_LANDMARKS.LEFT_EYE_BOTTOM].y
    );
    
    const rightEyeOpening = Math.abs(
      landmarks[FACIAL_LANDMARKS.RIGHT_EYE_TOP].y - 
      landmarks[FACIAL_LANDMARKS.RIGHT_EYE_BOTTOM].y
    );
    
    // Calculate difference between eye openings
    const asymmetry = Math.abs(leftEyeOpening - rightEyeOpening);
    
    // Check that one eye is open and one is closed
    const oneEyeClosed = Math.min(leftEyeOpening, rightEyeOpening) < 0.01;
    const oneEyeOpen = Math.max(leftEyeOpening, rightEyeOpening) > 0.02;
    
    // Return true if one eye is significantly more closed (winking)
    return asymmetry > 0.02 && oneEyeClosed && oneEyeOpen;
  },
  
  /**
   * Smiley Stretch: Check for a wide smile
   */
  smileyStretch: (landmarks: any): boolean => {
    const mouthLeft = landmarks[FACIAL_LANDMARKS.MOUTH_LEFT];
    const mouthRight = landmarks[FACIAL_LANDMARKS.MOUTH_RIGHT];
    const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
    const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
    
    // Measure mouth width
    const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
    
    // Check for upturned corners (smile shape)
    const mouthCornerHeight = (mouthLeft.y + mouthRight.y) / 2;
    const lipCenterHeight = (upperLip.y + lowerLip.y) / 2;
    const smileShape = mouthCornerHeight < lipCenterHeight;
    
    // Return true if smile is wide enough and has upturned corners
    return mouthWidth > 0.3 && smileShape;
  },
  
  /**
   * Nose Scruncher: Check if nose is scrunched
   */
  noseScruncher: (landmarks: any): boolean => {
    const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
    const noseBridge = landmarks[FACIAL_LANDMARKS.NOSE_BRIDGE];
    const leftBrowInner = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW_INNER];
    const rightBrowInner = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW_INNER];
    
    // When nose is scrunched, distance between tip and bridge decreases
    const noseLength = Math.abs(noseTip.y - noseBridge.y);
    
    // Brows typically move down/together when scrunching nose
    const browPinch = Math.abs(leftBrowInner.x - rightBrowInner.x);
    
    // Return true if nose is scrunched (reduced length) and brows are pinched
    return noseLength < 0.025 && browPinch < 0.08;
  },
  
  /**
   * Lip Pucker: Check if lips are pursed forward
   */
  lipPucker: (landmarks: any): boolean => {
    const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
    const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
    const upperLipTop = landmarks[FACIAL_LANDMARKS.UPPER_LIP_TOP];
    const lowerLipBottom = landmarks[FACIAL_LANDMARKS.LOWER_LIP_BOTTOM];
    const mouthLeft = landmarks[FACIAL_LANDMARKS.MOUTH_LEFT];
    const mouthRight = landmarks[FACIAL_LANDMARKS.MOUTH_RIGHT];
    
    // When lips are pursed, mouth width decreases
    const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
    
    // Lip height increases during pucker
    const lipHeight = Math.abs(upperLipTop.y - lowerLipBottom.y);
    
    // Lip protrusion is detected by forward position (negative Z value)
    const lipProtrusion = (upperLip.z + lowerLip.z) / 2;
    
    // Return true if mouth is narrow, lips protrude, and lip height increases
    return mouthWidth < 0.15 && lipProtrusion < -0.01 && lipHeight > 0.04;
  },
  
  /**
   * Chin Jutter: Check if chin is jutted forward
   */
  chinJutter: (landmarks: any): boolean => {
    const chin = landmarks[FACIAL_LANDMARKS.CHIN];
    const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
    const chinLeft = landmarks[FACIAL_LANDMARKS.CHIN_LEFT];
    const chinRight = landmarks[FACIAL_LANDMARKS.CHIN_RIGHT];
    
    // Chin jutting creates a negative Z difference relative to nose
    const chinProtrusion = noseTip.z - chin.z;
    
    // Chin width typically narrows slightly when jutting forward
    const chinWidth = Math.abs(chinLeft.x - chinRight.x);
    const normalChinWidth = 0.2; // Approximate normalized width
    const chinNarrowing = chinWidth < normalChinWidth;
    
    // Return true if chin is protruding forward enough
    return chinProtrusion > 0.015 && chinNarrowing;
  },
  
  /**
   * Forehead Smoother: Check for minimal forehead movement/wrinkles
   */
  foreheadSmoother: (landmarks: any): boolean => {
    const foreheadTop = landmarks[FACIAL_LANDMARKS.FOREHEAD_TOP];
    const foreheadMid = landmarks[FACIAL_LANDMARKS.FOREHEAD_MID];
    const leftBrow = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW];
    const rightBrow = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW];
    
    // Measure forehead variation (wrinkles create more variation)
    const verticalVariation = Math.abs(foreheadTop.y - foreheadMid.y);
    
    // Eyebrows should be in neutral position (not raised or furrowed)
    const browNeutralPosition = Math.abs(leftBrow.y - rightBrow.y) < 0.01;
    
    // Return true if forehead is smooth (minimal variation) and brows neutral
    return verticalVariation < 0.005 && browNeutralPosition;
  },
  
  /**
   * Tongue Twister: Check for open mouth with tongue extension
   * Note: MediaPipe doesn't directly track the tongue, so we use proxies
   */
  tongueTwister: (landmarks: any): boolean => {
    const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
    const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
    const upperLipTop = landmarks[FACIAL_LANDMARKS.UPPER_LIP_TOP];
    const lowerLipBottom = landmarks[FACIAL_LANDMARKS.LOWER_LIP_BOTTOM];
    
    // Measure mouth opening
    const mouthOpening = Math.abs(upperLip.y - lowerLip.y);
    
    // Total mouth height (should be large for tongue out)
    const totalMouthHeight = Math.abs(upperLipTop.y - lowerLipBottom.y);
    
    // Chin typically drops when sticking tongue out
    const chinDrop = landmarks[FACIAL_LANDMARKS.CHIN].y - lowerLipBottom.y;
    
    // Return true if mouth is very open with significant chin drop
    return mouthOpening > 0.1 && totalMouthHeight > 0.15 && chinDrop > 0.03;
  }
};

/**
 * Get a standardized description of facial exercise positions
 */
export function getExerciseInstructions(exerciseName: string): string {
  const instructions: Record<string, string> = {
    "Jaw Dropper": "Open your mouth wide, dropping your jaw as far as comfortable.",
    "Brow Lifter": "Raise your eyebrows high, as if surprised.",
    "Cheek Puffer": "Puff your cheeks out with air, hold, then release.",
    "Eye Winker": "Wink one eye, then the other. Keep alternating.",
    "Smiley Stretch": "Smile as wide as possible, showing your teeth.",
    "Nose Scruncher": "Scrunch your nose up like you smell something bad.",
    "Lip Pucker": "Pucker your lips forward as if giving a kiss.",
    "Chin Jutter": "Jut your chin forward, extending it away from your neck.",
    "Forehead Smoother": "Relax your forehead completely, removing all wrinkles.",
    "Tongue Twister": "Open your mouth and stick your tongue out as far as possible."
  };
  
  return instructions[exerciseName] || "Follow the on-screen guidance.";
}

/**
 * Get exercise benefits for CBT and stress reduction
 */
export function getExerciseBenefits(exerciseName: string): string {
  const benefits: Record<string, string> = {
    "Jaw Dropper": "Releases tension in the jaw, a common stress holding area. Improves blood flow to facial muscles.",
    "Brow Lifter": "Reduces forehead tension and headaches. Activates muscles associated with positive surprise emotions.",
    "Cheek Puffer": "Strengthens facial muscles and promotes awareness of tension patterns. Creates a playful mindset.",
    "Eye Winker": "Improves eye muscle control and reduces eye strain from digital devices. Engages playfulness.",
    "Smiley Stretch": "Activates the same neural pathways as genuine happiness, triggering positive emotion feedback loops.",
    "Nose Scruncher": "Releases tension in the central face area. Engages mindfulness through focused muscle control.",
    "Lip Pucker": "Improves circulation to lips and mouth area. Activates muscles rarely used in daily expressions.",
    "Chin Jutter": "Strengthens jawline and releases neck tension. Embodies confidence through posture adjustment.",
    "Forehead Smoother": "Trains conscious relaxation of worry-expressing muscles. Essential for appearing and feeling calm.",
    "Tongue Twister": "Releases tension in the tongue and throat. Improves vocal resonance and speech clarity under stress."
  };
  
  return benefits[exerciseName] || "This exercise helps reduce facial tension and promote mindfulness.";
}

/**
 * Get visual direction instructions for each exercise
 * Returns an object with direction, position, and description for visual aids
 */
export function getExerciseVisualDirection(exerciseName: string): { 
  direction: 'up' | 'down' | 'left' | 'right' | 'in' | 'out' | 'open' | 'close' | 'none',
  position: 'mouth' | 'eyes' | 'eyebrows' | 'cheeks' | 'chin' | 'forehead' | 'nose' | 'tongue',
  description: string
} {
  switch(exerciseName) {
    case "Jaw Dropper":
      return {
        direction: 'down',
        position: 'mouth',
        description: 'Drop your jaw down'
      };
    case "Brow Lifter":
      return {
        direction: 'up',
        position: 'eyebrows',
        description: 'Raise your eyebrows'
      };
    case "Cheek Puffer":
      return {
        direction: 'out',
        position: 'cheeks',
        description: 'Puff your cheeks out'
      };
    case "Eye Winker":
      return {
        direction: 'close',
        position: 'eyes',
        description: 'Close one eye'
      };
    case "Smiley Stretch":
      return {
        direction: 'out',
        position: 'mouth',
        description: 'Stretch your smile wide'
      };
    case "Nose Scruncher":
      return {
        direction: 'in',
        position: 'nose',
        description: 'Scrunch your nose'
      };
    case "Lip Pucker":
      return {
        direction: 'in',
        position: 'mouth',
        description: 'Pucker your lips'
      };
    case "Chin Jutter":
      return {
        direction: 'out',
        position: 'chin',
        description: 'Jut your chin forward'
      };
    case "Forehead Smoother":
      return {
        direction: 'none',
        position: 'forehead',
        description: 'Relax your forehead'
      };
    case "Tongue Twister":
      return {
        direction: 'out',
        position: 'tongue',
        description: 'Stick your tongue out'
      };
    default:
      return {
        direction: 'none',
        position: 'mouth',
        description: 'Follow the exercise instructions'
      };
  }
}

/**
 * Get the primary landmark points to focus on for each exercise
 * This helps in isolating the specific facial area for validation
 */
export function getExerciseFocusPoints(exerciseName: string): number[] {
  switch(exerciseName) {
    case "Jaw Dropper":
      return [
        FACIAL_LANDMARKS.CHIN, 
        FACIAL_LANDMARKS.NOSE_TIP, 
        FACIAL_LANDMARKS.UPPER_LIP, 
        FACIAL_LANDMARKS.LOWER_LIP
      ];
    case "Brow Lifter":
      return [
        FACIAL_LANDMARKS.LEFT_EYEBROW_OUTER,
        FACIAL_LANDMARKS.LEFT_EYEBROW_INNER,
        FACIAL_LANDMARKS.RIGHT_EYEBROW_OUTER,
        FACIAL_LANDMARKS.RIGHT_EYEBROW_INNER,
        FACIAL_LANDMARKS.NOSE_TIP
      ];
    case "Cheek Puffer":
      return [
        FACIAL_LANDMARKS.LEFT_CHEEK,
        FACIAL_LANDMARKS.RIGHT_CHEEK,
        FACIAL_LANDMARKS.LEFT_CHEEK_OUTER,
        FACIAL_LANDMARKS.RIGHT_CHEEK_OUTER
      ];
    case "Eye Winker":
      return [
        FACIAL_LANDMARKS.LEFT_EYE_TOP,
        FACIAL_LANDMARKS.LEFT_EYE_BOTTOM,
        FACIAL_LANDMARKS.RIGHT_EYE_TOP,
        FACIAL_LANDMARKS.RIGHT_EYE_BOTTOM
      ];
    case "Smiley Stretch":
      return [
        FACIAL_LANDMARKS.MOUTH_LEFT,
        FACIAL_LANDMARKS.MOUTH_RIGHT,
        FACIAL_LANDMARKS.UPPER_LIP,
        FACIAL_LANDMARKS.LOWER_LIP
      ];
    case "Nose Scruncher":
      return [
        FACIAL_LANDMARKS.NOSE_TIP,
        FACIAL_LANDMARKS.NOSE_BRIDGE,
        FACIAL_LANDMARKS.LEFT_EYEBROW_INNER,
        FACIAL_LANDMARKS.RIGHT_EYEBROW_INNER
      ];
    case "Lip Pucker":
      return [
        FACIAL_LANDMARKS.UPPER_LIP,
        FACIAL_LANDMARKS.LOWER_LIP,
        FACIAL_LANDMARKS.UPPER_LIP_TOP,
        FACIAL_LANDMARKS.LOWER_LIP_BOTTOM,
        FACIAL_LANDMARKS.MOUTH_LEFT,
        FACIAL_LANDMARKS.MOUTH_RIGHT
      ];
    case "Chin Jutter":
      return [
        FACIAL_LANDMARKS.CHIN,
        FACIAL_LANDMARKS.NOSE_TIP,
        FACIAL_LANDMARKS.CHIN_LEFT,
        FACIAL_LANDMARKS.CHIN_RIGHT
      ];
    case "Forehead Smoother":
      return [
        FACIAL_LANDMARKS.FOREHEAD_TOP,
        FACIAL_LANDMARKS.FOREHEAD_MID,
        FACIAL_LANDMARKS.LEFT_EYEBROW,
        FACIAL_LANDMARKS.RIGHT_EYEBROW
      ];
    case "Tongue Twister":
      return [
        FACIAL_LANDMARKS.UPPER_LIP,
        FACIAL_LANDMARKS.LOWER_LIP,
        FACIAL_LANDMARKS.UPPER_LIP_TOP,
        FACIAL_LANDMARKS.LOWER_LIP_BOTTOM,
        FACIAL_LANDMARKS.CHIN
      ];
    default:
      return [];
  }
}