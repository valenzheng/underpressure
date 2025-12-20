# Under Pressure
### Welcome to the Future of Nursing Training!

![image](https://github.com/valenzheng/underpressure/blob/main/cover.png)

Step into the fast paced world of emergency medicine with Under Pressure, a 3D ER simulation for nursing students and healthcare learners. Built for CS 460 – Graphics, this experience places you in a chaotic emergency room projected across four walls. Every decision matters. No resets, no retries.

You’ll face a critical trauma case: Jordan R., a 28 year old involved in a motorcycle crash, battling hypovolemic shock and potential internal bleeding. Your role is to make rapid, evidence based decisions to stabilize vital signs, recognize shock, and prioritize life saving interventions. The clock is ticking. Wrong choices accumulate, accelerating heart rate decline, intensifying audio and visual stress, and ultimately leading to cardiac arrest if critical thresholds are crossed.

**Key Features:**

- Immersive 3D ER environment with dynamic chaos
- Realistic patient vitals (heart rate and blood pressure that respond to your actions
- 10 critical decision points covering assessment, intervention and clinical judgment
- No instant failure mirrors real ER logic: one mistake may be survivable, but delayed/repeated poor decisions are fatal
- Visual/audio feedback (flashing vitals, escalating alarms, dimming lights) to amplify pressure
- Interactive decision windows that appear when interacting with the patient

# Installation

To play Under Pressure or access the game files, follow these simple steps:

### Option 1: Play Directly Online
Visit the live game link to start the simulation instantly (no downloads required): https://valenzheng.github.io/underpressure/

### Option 2: Download and Run Locally
If the online link isn’t working, download the game files and run it from your device:
1. Navigate to the GitHub repository: https://github.com/valenzheng/underpressure.git
2. Click the Code button and select Download ZIP to save all game files to your computer.
3. Extract the ZIP folder to your desired location.
4. Open the extracted folder and double click the index.html file to launch the game in your default web browser.
No additional software or dependencies are required, just a modern web browser (Chrome, Firefox, Edge, or Safari recommended).
   
# Usage
### How to Play
1. Launch the simulation via the online link or index.html file and you’ll spawn in the chaotic ER bay with Jordan R. on a gurney in front of you.
2. Observe the environment and patient presentation (pale skin, rapid breathing, rigid abdomen) to inform your decisions.
3. Interact with triggers (e.g., the patient) to unlock decision windows.
4. Select the best answer for each multiple choice prompt, your choice will immediately impact the patient’s vitals.
5. Monitor the heart rate/BP indicators:
   - Yellow = unstable vitals
   - Red = critical state (one more wrong decision may cause cardiac arrest)
6. Aim to stabilize the patient’s vitals by making consistent, evidence based choices to reach the success end state.

# Challenges and Future Improvements

The team acknowledges that there are improvements to be made in the game, as we expand this game to all nursing students. This project is not finished, and key challenges and enhancements are outlined below:

### Key Challenges
- Given technical challenges with the company’s Unity SDK, we shifted focus to another area of immersive simulation that is being leveraged in the space for VR-based nursing simulation.
- Implementing dynamic visuals (nurses/doctors rushing through the ER bay) and patient pain animations (grimacing, labored breathing) proved technically challenging and are not yet included in the current version.

### Future Improvements
- Additional Visual & Animation Elements: Refine and implement the planned dynamic ER staff visuals and patient pain animations to enhance immersion.
- More Patient Cases: Expand beyond the motorcycle crash scenario to include diverse trauma cases (e.g., falls, gunshot wounds) and non trauma emergencies (e.g., sepsis, cardiac events) to broaden training relevance.
- Enhanced Educational Feedback: Add post decision explanations to reinforce clinical reasoning (e.g., "Lactated Ringer’s is preferred for trauma because it mimics plasma electrolyte composition").
- Nursing Cave Optimization: Further refine the simulation to align with the Nursing Cave 3D track’s projection and interaction requirements for seamless use in training facilities.
- Difficulty Customization: Introduce adjustable pressure levels (e.g., slower/faster vitals decline) to accommodate beginner and advanced nursing learners.

# Assets Credits

## 3D Assets

- **Patient 3D Model**  
  Created by edouard77 (Sketchfab)  
  https://sketchfab.com/3d-models/patient-00b483f284a542899b94e99831f1ad1c

- **Hospital Room 3D Model**  
  Created by Chenchanchong (Sketchfab)  
  https://sketchfab.com/3d-models/hospital-ward-d8a55871b8fb4d708d3687b3a39f6688

## Audio Assets

- **Heartbeat Sound**  
  Created by DRAGON-STUDIO (Pixabay)  
  https://pixabay.com/sound-effects/heartbeat-sound-372448/

- **The Terror of Flatlining**  
  Created by freesound_community (Pixabay)  
  https://pixabay.com/sound-effects/the-terror-of-flatlining-34031/

- **Hospital Busy X-Ray Room Tone**  
  Created by freesound_community (Pixabay)  
  https://pixabay.com/sound-effects/hospital-busy-x-ray-room-tone-56441/

# Authors and Acknowledgment

### Creators

Valentina Zheng

Jhennifer Campos

### Special Thanks

David Martinez (Nursing College 3D Cave) for his invaluable guidance on optimizing the game for the Nursing Cave environment and providing critical feedback throughout development.

The CS 460 - Computer Graphics course and Professor Daniel Haehn for teaching core concepts (3D projection and interactive design) that made this project possible.

We applied skills learned in CS 460, including web based 3D rendering, user interaction design, and dynamic feedback systems to create an educational tool that bridges graphics technology and nursing training.

Course Website: CS460.org
