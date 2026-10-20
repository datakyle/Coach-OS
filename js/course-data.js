/* Player Course content. One entry per week; each week is a list of lessons.
   Written for the players, in plain English. To add Week 2, copy the Week 1
   object and change the lessons. No code changes needed.

   Lesson fields
     id        unique, never reuse (progress is saved by id)
     title     shown in the list and the lesson header
     mins      rough reading time
     idea      the big idea, two or three sentences
     points    [title, text] pairs: what you need to know
     cues      the words Coach will yell at practice
     visuals   any of: { type: "spots" }, { type: "shell" }, { type: "timer" },
               { type: "routine", items: [[move, reps]] },
               { type: "play", name, play }  (play format below)
     floor     what we do with it at practice this week
     quiz      [{ q, o: [options], a: index of right answer, e: explanation }]

   Play format (court units: rim at 280,93; baseline y=40; half court y=400)
     o / d     starting spots by number: { 1: [x, y], ... }
     ball      offensive number holding the ball
     steps     each step is a list of actions:
               ["move", "o2", x, y]    cut
               ["dribble", "o1", x, y]
               ["pass", "o1", "o5"]
               ["shot", "o2"]
               ["dmove", "d3", x, y]   defender slides
     captions  captions[0] explains the start, captions[k] explains step k */
window.CourseData = {
  weeks: [
    {
      n: 1,
      title: "Foundation",
      goal: "Learn the language of the floor, guard as a team, finish every stop with a rebound, and find out where your conditioning starts.",
      lessons: [
        {
          id: "w1-floor",
          title: "Know the Floor",
          mins: 6,
          idea: "Coach can only call what you can find. Every spot on the floor has a name, and every name has a job. When you hear a spot, sprint there, land in a stance and show your hands.",
          points: [
            ["Spots, not areas", "You always stand on a named spot. If a teammate is already on your spot, you move to an open one."],
            ["15 to 18 feet apart", "About five big steps from each teammate. Closer than that and one defender can guard two of you."],
            ["Ball side and help side", "Split the floor down the middle. The half with the ball is ball side. The other half is help side (also called weak side)."],
            ["Gaps", "The space between two defenders. Drive into a gap and two defenders have to decide who stops you. That hesitation is your opening."]
          ],
          cues: ["Name your spot", "Spread to 15", "Hit the gap"],
          visuals: [
            { type: "spots" },
            {
              type: "play",
              name: "Crowded vs spaced",
              play: {
                o: { 1: [280, 351], 2: [360, 296], 3: [335, 211], 4: [230, 161], 5: [205, 286] },
                d: { 1: [280, 311], 2: [345, 262], 3: [318, 186], 4: [245, 138], 5: [222, 254] },
                ball: 1,
                steps: [
                  [["move", "o2", 470, 236], ["move", "o3", 500, 69], ["move", "o4", 60, 69], ["move", "o5", 90, 236],
                   ["dmove", "d2", 440, 222], ["dmove", "d3", 470, 92], ["dmove", "d4", 90, 92], ["dmove", "d5", 120, 222]],
                  [["dribble", "o1", 286, 150], ["dmove", "d1", 294, 196], ["dmove", "d5", 232, 150]],
                  [["pass", "o1", "o5"]]
                ],
                captions: [
                  "Five players bunched up inside the arc. Look at x2: he's close enough to guard 2 and 3 at the same time, and x4 is parked in front of the rim.",
                  "Everyone spreads to a spot on the arc, 15 to 18 feet apart. Now each defender can only guard one player, and the middle of the floor is empty.",
                  "1 drives the open lane. x5 has a problem: stop the layup or stay with 5. He can't do both.",
                  "x5 helped, so 5 is wide open. That's why we space: one defender can't do two jobs."
                ]
              }
            }
          ],
          floor: "Spot Sprint at the start of practice: Coach calls a spot, everyone sprints there and lands in a stance. Wrong spot or last one there, we go again.",
          quiz: [
            { q: "You and a teammate are standing 6 feet apart on the wing. Why is that a problem?", o: ["One defender can guard both of you", "You might bump into each other", "It's a lane violation", "Passes get too long"], a: 0, e: "A defender standing between two players who are close together can guard both. Spacing forces every defender to guard just one person." },
            { q: "The ball is on the right wing. Where is the help side?", o: ["The right corner", "The left half of the floor", "The paint", "Above the 3-point line"], a: 1, e: "Help side (weak side) is the half of the floor away from the ball. That's where help defenders stand and where skip passes go." },
            { q: "Where is the short corner?", o: ["Top of the key", "The elbow", "On the baseline, between the lane and the corner", "Half court"], a: 2, e: "The short corner is on the baseline about halfway between the lane and the corner. Zone defenders have to turn their heads to see it." },
            { q: "Coach yells \"Left elbow!\" Where do you go?", o: ["Where the free-throw line meets the left side of the lane", "The left corner", "Left side of the half-court line", "The left block"], a: 0, e: "The elbows are the two corners of the free-throw line, where it meets the lane lines." }
          ]
        },
        {
          id: "w1-warmup",
          title: "Warm Up Every Day",
          mins: 3,
          idea: "Warm muscles move faster and get hurt less. Our warm-up is the same 8 minutes every practice, in the same order, so it runs itself. Captains start it the minute practice starts. Nobody waits for Coach.",
          points: [
            ["Same order, every day", "When the routine is automatic, nobody wastes time asking what's next."],
            ["Move, don't hold", "We warm up by moving (dynamic). Long stretches where you hold still come after practice, not before."],
            ["Build to full speed", "Start easy, finish fast. The last two sprints get you to game speed before the first drill."],
            ["Talk while you move", "Call out the next move, encourage each other. A loud warm-up means a sharp practice."]
          ],
          cues: ["Warm, not tired", "Talk while you move", "Captains, go"],
          visuals: [
            {
              type: "routine",
              items: [
                ["Jog", "Baseline to half court and back"],
                ["High knees", "Half court and back"],
                ["Butt kicks", "Half court and back"],
                ["Carioca", "Down facing left, back facing right"],
                ["Walking lunge with a twist", "Half court and back"],
                ["Leg swings", "10 front-to-back, 10 side-to-side, each leg"],
                ["Defensive slides", "Low stance, half court and back"],
                ["Build-up sprints", "One at 75% speed, one at 90%"]
              ]
            }
          ],
          floor: "Captains lead warm-up at the start of every practice. Coach times it: 8 minutes, done right, no stopping.",
          quiz: [
            { q: "Who starts warm-up?", o: ["Coach, once everyone is quiet", "The captains, as soon as practice starts", "Whoever gets there first", "Nobody, we start with shooting"], a: 1, e: "Captains start it right away so we don't lose minutes waiting around." },
            { q: "Which kind of stretching do we do before practice?", o: ["Holding long stretches on the floor", "Moving stretches like lunges and leg swings", "None at all", "Only arm circles"], a: 1, e: "Moving (dynamic) warm-ups get your body ready to run and jump. Long holds are for after practice." },
            { q: "How does warm-up end?", o: ["A water break", "Two build-up sprints, 75% then 90%", "Free throws", "Sitting down to listen"], a: 1, e: "The build-up sprints get you to game speed so the first drill isn't the first time you run hard." }
          ]
        },
        {
          id: "w1-packline",
          title: "Pack Line: Ball, Gap, Help",
          mins: 8,
          idea: "Our defense is man-to-man with one big rule: if you're not guarding the ball, you're inside the pack line, an imaginary line about 16 feet from the rim. The on-ball defender forces every drive to the middle, straight into the pack, where four of us are waiting. We're not the tallest team, so we protect the paint with bodies that are already there.",
          points: [
            ["Ball: force middle", "Arm's length off, shaded to his baseline side with your top foot high. Never give up the baseline. Push him middle, into the pack. Yell \"Ball!\""],
            ["Gap: one pass away", "Stand on the line between your man and the ball, inside the pack line. Don't try to steal the pass. When the ball is forced middle, you're the first wall he sees."],
            ["Help: two passes away", "Feet in the lane. Point one hand at the ball and one at your man. You're the wall at the rim."],
            ["Move on the pass", "Your job changes every time the ball moves. Get to your new spot while the ball is in the air, not after it's caught."],
            ["Talk", "\"Ball!\" from the on-ball defender. \"Help left!\" or \"Help right!\" from the helpers. \"Shot!\" when it goes up."]
          ],
          cues: ["Force middle", "Ball, gap, help", "Move on the pass", "See ball, see man"],
          visuals: [{ type: "shell" }],
          floor: "Shell drill, Stage 1: 4 on 4, no dribbling. Offense passes slowly, and the defense jumps to Ball, Gap and Help while the ball is in the air. Coach checks every spot.",
          quiz: [
            { q: "The ball is on the right wing. Your man is on the left wing. Where are you?", o: ["Right next to him, denying the pass", "In the lane, where you can see the ball and your man", "Running to double the ball", "At half court"], a: 1, e: "Your man is two passes away, so you're in help: feet in the lane, one hand on the ball, one on your man." },
            { q: "Your man is one pass away from the ball. What's your job?", o: ["Deny the pass with your hand in the lane", "Stand in the gap, ready to stop a drive", "Guard the rim under the basket", "Guard the ball too"], a: 1, e: "In pack line we don't deny. You sit in the gap between your man and the ball, inside the pack line, so you can stop a drive." },
            { q: "When do you move to your new spot?", o: ["After your man catches it", "While the pass is in the air", "When Coach yells", "Only if your man moves"], a: 1, e: "Move on the pass. If you wait for the catch, you're already late." },
            { q: "On the ball, which way do you never let him go?", o: ["To the baseline", "To the middle", "Backwards", "To half court"], a: 0, e: "Never give up baseline. Baseline drives get behind our help. We force him middle, where the whole pack is waiting for him." }
          ]
        },
        {
          id: "w1-boxout",
          title: "Box Out: Find, Hit, Get",
          mins: 5,
          idea: "A stop isn't a stop until we get the rebound. Bigger teams win rebounds when everyone just jumps for the ball. We win by hitting first: find your man, put your body into him, then go get it. All five of us, guards too.",
          points: [
            ["Find", "When the shot goes up, yell \"Shot!\" and find your man right away. Don't watch the ball."],
            ["Hit", "Step to him and make contact first, low, with your backside and arms wide. Keep him behind you."],
            ["Get", "Then go get the ball. Two hands, chin it, elbows out."],
            ["Five on the glass", "Everyone boxes out. A rebound by a guard starts the fastest break we've got."],
            ["Long shot, long rebound", "Threes bounce far. Misses from the side usually come off on the opposite side, so help-side players own that area."]
          ],
          cues: ["Shot!", "Find, hit, get", "Five on the glass"],
          visuals: [
            {
              type: "play",
              name: "Find, hit, get",
              play: {
                o: { 1: [280, 318], 2: [470, 230], 3: [90, 230], 4: [392, 168], 5: [168, 168] },
                d: { 1: [280, 285], 2: [443, 213], 3: [117, 213], 4: [368, 150], 5: [192, 150] },
                ball: 2,
                steps: [
                  [["shot", "o2"]],
                  [["move", "o1", 280, 270], ["move", "o2", 430, 195], ["move", "o3", 135, 190], ["move", "o4", 345, 140], ["move", "o5", 213, 140],
                   ["dmove", "d1", 280, 240], ["dmove", "d2", 405, 178], ["dmove", "d3", 160, 172], ["dmove", "d4", 325, 120], ["dmove", "d5", 232, 120]],
                  [["dmove", "d5", 258, 105]]
                ],
                captions: [
                  "2 has the ball on the wing. Every defender is in position. Watch what happens when he shoots.",
                  "Shot! The ball goes up. Everyone yells \"Shot!\" and finds their man. Eyes on your man, not the ball.",
                  "Hit: all five offensive players crash, and all five of us step into them first. Low, wide, backside into his body. Nobody gets between us and the rim.",
                  "Get: once your man is sealed, go get the ball. Two hands, chin it. Here x5 grabs it because the miss came off the help side."
                ]
              }
            }
          ],
          floor: "Hit and Get Box-Out drill in pairs. Defense has to win 3 in a row to rotate out. Every shell drill rep ends with a box-out too.",
          quiz: [
            { q: "What's the right order?", o: ["Jump, grab, land", "Find, hit, get", "Watch, react, chase", "Hit, find, get"], a: 1, e: "Find your man, hit him first, then get the ball. Most of our rebounds come after the box-out, not instead of it." },
            { q: "When the shot goes up, where are your eyes first?", o: ["On the ball", "On your man", "On the ref", "On the coach"], a: 1, e: "Find your man first. If you watch the ball, he walks right past you." },
            { q: "Who boxes out?", o: ["Only the big men", "Only the player guarding the shooter", "All five players", "Nobody, we leak out"], a: 2, e: "Five on the glass. We aren't bigger, so we win with more bodies doing it right." },
            { q: "A three is missed from the left wing. Where should you expect it?", o: ["Right back to the shooter", "On the right side of the rim", "Straight down under the rim", "Out of bounds"], a: 1, e: "A common rule of thumb: misses from the side tend to come off on the opposite side, and long shots bounce long." }
          ]
        },
        {
          id: "w1-17s",
          title: "Sideline 17s",
          mins: 3,
          idea: "Sideline 17s are our conditioning test. Sprint from one sideline to the other and touch the line, 17 touches in all. With only 8 of us, the five on the floor have to be the freshest five in the fourth quarter. This week we find out where you start.",
          points: [
            ["17 touches", "Touch each sideline with your foot. Every touch counts as one. 17 touches and you finish on the far sideline."],
            ["Count out loud", "Run in pairs. Your partner counts your touches and runs the clock."],
            ["Two rounds", "Rest 2 minutes between rounds. Shoot 2 free throws during the rest, because games are decided by tired legs at the line."],
            ["Retest every two weeks", "Log your time here. Beating your own number is the goal."]
          ],
          cues: ["Touch every line", "Run to compete", "Win the fourth"],
          visuals: [{ type: "timer" }],
          floor: "End of practice on Day 1: everyone runs 17s and logs the time. We'll retest in Week 3 and Week 5.",
          quiz: [
            { q: "How many line touches in one round of 17s?", o: ["10", "15", "17", "20"], a: 2, e: "17 touches, sideline to sideline." },
            { q: "Why do we shoot free throws during the rest?", o: ["To fill time", "Because close games are decided by free throws on tired legs", "It's a punishment", "To cool down"], a: 1, e: "In the fourth quarter you'll be shooting tired. Practice it now." },
            { q: "What's the real goal of the retest?", o: ["Beat the fastest player on the team", "Beat your own time", "Finish without stopping", "Run faster than last season's team"], a: 1, e: "Everyone starts somewhere different. Getting faster than your own number is what wins fourth quarters." }
          ]
        }
      ]
    }
  ]
};
