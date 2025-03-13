/**
 * FacialAnalysis.ts
 * 
 * This utility provides heuristic-based facial analysis functions for:
 * 1. Stress detection based on facial expressions
 * 2. Validation of specific facial exercises
 */

// Common landmark indices for facial features
const FACIAL_LANDMARKS = {
    // Eyes
    LEFT_EYE_TOP: 159,
    LEFT_EYE_BOTTOM: 145,
    RIGHT_EYE_TOP: 386,
    RIGHT_EYE_BOTTOM: 374,
    
    // Eyebrows
    LEFT_EYEBROW: 107,
    RIGHT_EYEBROW: 336,
    
    // Mouth
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
    UPPER_LIP: 13,
    LOWER_LIP: 14,
    
    // Face structure
    NOSE_TIP: 4,
    NOSE_BRIDGE: 6,
    CHIN: 152,
    FOREHEAD_TOP: 10,
    FOREHEAD_MID: 151,
    
    // Cheeks
    LEFT_CHEEK: 234,
    RIGHT_CHEEK: 454
  };
  
  /**
   * Calculate stress level based on facial features
   * Returns a value between 0-1 where higher values indicate more stress
   */
  export function calculateStressLevel(landmarks: any): number {
    if (!landmarks) return 0.5; // Default neutral value if landmarks are unavailable
    
    // Gather key metrics that correlate with stress
    
    // 1. Measure eyebrow contraction (knitted brows indicate stress)
    const leftBrow = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW];
    const rightBrow = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW];
    const noseBridge = landmarks[FACIAL_LANDMARKS.NOSE_BRIDGE];
    
    const eyebrowContraction = Math.abs(
      (leftBrow.x - noseBridge.x) + (rightBrow.x - noseBridge.x)
    ) / 2;
    
    // 2. Measure mouth tension (tight lips indicate stress)
    const mouthWidth = Math.abs(
      landmarks[FACIAL_LANDMARKS.MOUTH_LEFT].x - 
      landmarks[FACIAL_LANDMARKS.MOUTH_RIGHT].x
    );
    
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
    
    // 4. Forehead smoothness (wrinkles indicate stress)
    const foreheadTop = landmarks[FACIAL_LANDMARKS.FOREHEAD_TOP];
    const foreheadMid = landmarks[FACIAL_LANDMARKS.FOREHEAD_MID];
    const foreheadVariation = Math.abs(foreheadTop.y - foreheadMid.y);
    
    // Normalize and combine factors with appropriate weights
    // These weights can be tuned based on empirical observations
    
    // Inverted mouth width - smaller width = higher stress
    const mouthFactor = 1 - Math.min(1, mouthWidth * 3.5);
    
    // Higher eyebrow contraction = higher stress
    const eyebrowFactor = Math.min(1, eyebrowContraction * 5);
    
    // Extreme eye openness (either very open or very closed) = higher stress
    const eyeFactor = Math.abs(eyeOpenness - 0.03) * 10;
    
    // Higher forehead variation = higher stress
    const foreheadFactor = Math.min(1, foreheadVariation * 15);
    
    // Combine all factors with weights
    let stressLevel = 
      (mouthFactor * 0.35) + 
      (eyebrowFactor * 0.30) + 
      (eyeFactor * 0.20) + 
      (foreheadFactor * 0.15);
    
    // Add a small random factor for natural variation
    stressLevel = stressLevel * 0.9 + Math.random() * 0.1;
    
    // Ensure the value is between 0-1
    return Math.min(1, Math.max(0, stressLevel));
  }
  
  /**
   * Exercise validation functions
   * Each returns true if the exercise is performed correctly
   */
  export const ExerciseValidators = {
    /**
     * Jaw Dropper: Check if jaw is dropped enough
     */
    jawDropper: (landmarks: any): boolean => {
      const chin = landmarks[FACIAL_LANDMARKS.CHIN];
      const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
      
      // Measure vertical distance between chin and nose
      const jawDrop = Math.abs(chin.y - noseTip.y);
      
      // Return true if jaw is dropped sufficiently
      return jawDrop > 0.22; // Normalized threshold
    },
    
    /**
     * Brow Lifter: Check if eyebrows are raised
     */
    browLifter: (landmarks: any): boolean => {
      const leftBrow = landmarks[FACIAL_LANDMARKS.LEFT_EYEBROW];
      const rightBrow = landmarks[FACIAL_LANDMARKS.RIGHT_EYEBROW];
      const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
      
      // Calculate average eyebrow height relative to nose
      const browHeight = ((noseTip.y - leftBrow.y) + (noseTip.y - rightBrow.y)) / 2;
      
      // Return true if brows are lifted enough
      return browHeight > 0.15; // Normalized threshold
    },
    
    /**
     * Cheek Puffer: Check if cheeks are puffed out
     */
    cheekPuffer: (landmarks: any): boolean => {
      const leftCheek = landmarks[FACIAL_LANDMARKS.LEFT_CHEEK];
      const rightCheek = landmarks[FACIAL_LANDMARKS.RIGHT_CHEEK];
      
      // Measure the width between cheeks
      const cheekWidth = Math.abs(leftCheek.x - rightCheek.x);
      
      // Return true if cheeks are puffed enough
      return cheekWidth > 0.25; // Normalized threshold
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
      
      // Return true if one eye is significantly more closed (winking)
      return asymmetry > 0.02; // Normalized threshold
    },
    
    /**
     * Smiley Stretch: Check for a wide smile
     */
    smileyStretch: (landmarks: any): boolean => {
      const mouthLeft = landmarks[FACIAL_LANDMARKS.MOUTH_LEFT];
      const mouthRight = landmarks[FACIAL_LANDMARKS.MOUTH_RIGHT];
      
      // Measure mouth width
      const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
      
      // Return true if smile is wide enough
      return mouthWidth > 0.3; // Normalized threshold
    },
    
    /**
     * Nose Scruncher: Check if nose is scrunched
     */
    noseScruncher: (landmarks: any): boolean => {
      const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
      const noseBridge = landmarks[FACIAL_LANDMARKS.NOSE_BRIDGE];
      
      // When nose is scrunched, distance between tip and bridge decreases
      const noseLength = Math.abs(noseTip.y - noseBridge.y);
      
      // Return true if nose is scrunched (reduced length)
      return noseLength < 0.025; // Normalized threshold
    },
    
    /**
     * Lip Pucker: Check if lips are pursed forward
     */
    lipPucker: (landmarks: any): boolean => {
      const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
      const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
      const mouthLeft = landmarks[FACIAL_LANDMARKS.MOUTH_LEFT];
      const mouthRight = landmarks[FACIAL_LANDMARKS.MOUTH_RIGHT];
      
      // When lips are pursed, mouth width decreases
      const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);
      
      // Lip protrusion is detected by forward position (negative Z value)
      const lipProtrusion = (upperLip.z + lowerLip.z) / 2;
      
      // Return true if mouth is narrow and lips protrude
      return mouthWidth < 0.15 && lipProtrusion < -0.01; // Normalized thresholds
    },
    
    /**
     * Chin Jutter: Check if chin is jutted forward
     */
    chinJutter: (landmarks: any): boolean => {
      const chin = landmarks[FACIAL_LANDMARKS.CHIN];
      const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP];
      
      // Chin jutting creates a negative Z difference relative to nose
      const chinProtrusion = noseTip.z - chin.z;
      
      // Return true if chin is protruding forward enough
      return chinProtrusion > 0.015; // Normalized threshold
    },
    
    /**
     * Forehead Smoother: Check for minimal forehead movement/wrinkles
     */
    foreheadSmoother: (landmarks: any): boolean => {
      const foreheadTop = landmarks[FACIAL_LANDMARKS.FOREHEAD_TOP];
      const foreheadMid = landmarks[FACIAL_LANDMARKS.FOREHEAD_MID];
      
      // Measure forehead variation (wrinkles create more variation)
      const variation = Math.abs(foreheadTop.y - foreheadMid.y);
      
      // Return true if forehead is smooth (minimal variation)
      return variation < 0.005; // Normalized threshold
    },
    
    /**
     * Tongue Twister: Check for open mouth (proxy for tongue out)
     * Note: MediaPipe doesn't directly track the tongue
     */
    tongueTwister: (landmarks: any): boolean => {
      const upperLip = landmarks[FACIAL_LANDMARKS.UPPER_LIP];
      const lowerLip = landmarks[FACIAL_LANDMARKS.LOWER_LIP];
      
      // Measure mouth opening
      const mouthOpening = Math.abs(upperLip.y - lowerLip.y);
      
      // Return true if mouth is very open (likely has tongue out)
      return mouthOpening > 0.1; // Normalized threshold
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