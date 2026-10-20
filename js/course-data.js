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
     visuals   any of: { type: "spots" }, { type: "timer" },
               { type: "shell", title, sub, modes: ["watch","turn"], lines: ["pack","side","tri","force"] },
               { type: "routine", items: [[move, reps]] },
               { type: "play", name, play }  (play format below)
     why       optional [title, text] pairs shown as "Why we play it"
     checks    optional list shown as "What Coach is watching for"
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
      title: "Pack Line Defense",
      goal: "Learn the floor, then learn our defense. By Friday you should know your job, Ball, Gap or Help, on every pass. Get every quiz question right to unlock the secret word.",
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
          id: "w1-pl-why",
          title: "Pack Line: The Why",
          mins: 6,
          idea: "Our defense is the pack line. It's man-to-man with one big rule: if you're not guarding the ball, you're inside the pack line. We aren't the tallest team and we don't have a shot blocker, so we protect the rim with numbers instead of height. The ball defender forces every drive middle, straight into four of us waiting in the lane.",
          points: [
            ["The pack line", "An invisible arc about 16 feet from the rim, a couple of steps inside the 3-point line. If you're not on the ball, at least one foot stays inside it."],
            ["Ball side and help side", "An invisible line splits the floor down the middle. The half with the ball is ball side. The other half is help side. Helpers live on the help side, in the lane."],
            ["Ball, you, man", "Every defender off the ball makes a flat triangle with the ball and his man. Stand where you can see both without turning your head."],
            ["Force middle", "The ball defender takes away the baseline. The driver has to go middle, and the middle is where the pack is waiting."]
          ],
          why: [
            ["Help is already there", "We don't have to race to the rim to help. We're standing in front of it before the drive starts."],
            ["Fewer fouls", "Helpers are in position early, so nobody has to reach or lunge late. We need our best players on the floor, not on the bench with fouls."],
            ["Better rebounding", "All five of us are near the rim when the shot goes up. That's how a small team wins the boards."],
            ["Easy to learn", "Three jobs and one line. Every possession you only answer one question: where's the ball?"]
          ],
          cues: ["The paint is ours", "Force middle", "Inside the line"],
          visuals: [{ type: "shell", title: "The invisible lines", sub: "Turn each line on and off", modes: ["watch"], lines: ["pack", "side", "tri", "force"] }],
          floor: "Coach will walk the shell drill and freeze it. When he yells \"Freeze!\", point to the pack line and tell him which side of the floor you're on.",
          quiz: [
            { q: "What is the pack line?", o: ["The 3-point line", "An invisible arc about 16 feet from the rim", "The free-throw line", "The half-court line"], a: 1, e: "It's a couple of steps inside the 3-point line. If you're not guarding the ball, at least one foot stays inside it." },
            { q: "Which way does the ball defender force the driver?", o: ["Baseline", "Middle, into the pack", "Back to half court", "Whichever way he wants"], a: 1, e: "We take away the baseline and force him middle, where four teammates are waiting in the lane." },
            { q: "Why does the pack line fit our team?", o: ["We're taller than everyone", "It lets us gamble for steals", "Help is already near the rim, so we don't need a shot blocker", "It means less running"], a: 2, e: "We protect the rim with bodies that are already there, not with height." },
            { q: "The ball is on the left wing. Where is the help side?", o: ["The left corner", "The right half of the floor", "The top of the key", "Behind the half-court line"], a: 1, e: "Help side is the half of the floor away from the ball. With the ball on the left, it's the right half." },
            { q: "\"Ball, you, man\" means:", o: ["Always face your man", "Stand where you can see the ball and your man at the same time", "Guard the ball, then your man", "Follow the ball everywhere"], a: 1, e: "Make a flat triangle with the ball and your man so you can see both without turning your head." }
          ]
        },
        {
          id: "w1-pl-bgh",
          title: "Ball, Gap, Help",
          mins: 8,
          idea: "Every time the ball moves, every defender has one of three jobs: Ball, Gap or Help. Your job depends on how many passes your man is from the ball. Learn the three spots, and you'll always know where to stand.",
          points: [
            ["Ball: your man has it", "Arm's length off, shaded to his baseline side with your top foot high. Hands active, high hand on a shot. Never give up baseline. Force him middle. Yell \"Ball!\""],
            ["Gap: one pass away", "On the line between your man and the ball, inside the pack line. Don't deny the pass. When the ball comes middle, you're the first wall he sees. Stop him, then get back to your man."],
            ["Help: two passes away", "Feet in the lane. One hand pointed at the ball, one at your man. You're the wall at the rim. Yell \"Help left!\" or \"Help right!\""],
            ["Your job changes on every pass", "One pass can turn you from Help to Gap, or from Gap to Ball. Move while the ball is in the air so you're in your new spot before the catch."]
          ],
          cues: ["Ball, gap, help", "Move on the pass", "See ball, see man"],
          visuals: [{ type: "shell", title: "Shell lab", sub: "5 on 5", modes: ["watch", "turn"], lines: ["pack"] }],
          floor: "Shell drill, Stage 1: 5 on 5, no dribbling. The offense passes slowly, and the defense jumps to Ball, Gap and Help while the ball is in the air. Coach checks every spot.",
          quiz: [
            { q: "The ball is on the right wing. Your man is on the left wing. What's your job?", o: ["Ball", "Gap", "Help", "Deny"], a: 2, e: "Your man is two passes away, so you're in Help: feet in the lane, one hand on the ball, one on your man." },
            { q: "The ball is at the top. Your man is on the right wing. What's your job?", o: ["Ball", "Gap", "Help", "Double the ball"], a: 1, e: "One pass away is Gap. Get on the line between your man and the ball, inside the pack line." },
            { q: "You're in Gap. Should you try to steal the pass to your man?", o: ["Yes, always deny", "No, stay in the gap and be ready to stop a drive", "Only if he's a good shooter", "Only in the fourth quarter"], a: 1, e: "Pack line doesn't deny. We give up the pass to stay in position to stop the drive." },
            { q: "Where do a Help defender's feet go?", o: ["Behind the 3-point line", "In the lane", "On the baseline out of bounds", "Next to his man"], a: 1, e: "Feet in the lane. That's what makes the wall at the rim." },
            { q: "Your man has the ball on the wing. Where do you stand?", o: ["Between him and the middle of the floor", "Arm's length off, shaded to his baseline side", "Right behind him", "In the lane"], a: 1, e: "Shade baseline with your top foot high. He can't go baseline, so he has to drive middle into the pack." }
          ]
        },
        {
          id: "w1-pl-rules",
          title: "The Pack Line Rules",
          mins: 7,
          idea: "Six rules make the pack line work. Learn them here, then we'll drill them all week. If all five of us follow these rules on every possession, the driver sees a wall every time he looks at the rim.",
          points: [
            ["1. Pack line", "If you're not guarding the ball, at least one foot stays inside the 16-foot line. The paint is ours."],
            ["2. Move on the pass", "All five move while the ball is in the air. Be in your new spot before the catch."],
            ["3. Ball, gap, help", "Every trip, know which one you are. Your job changes every time the ball moves."],
            ["4. Closeouts", "Sprint the first two-thirds, then chop your feet. High hand, weight back. Push him middle, into help."],
            ["5. Talk", "\"Ball!\" from the on-ball defender. \"Help!\" from the helpers. \"Shot!\" when it goes up."],
            ["6. Finish with the board", "A stop isn't a stop until we get the rebound. Find your man, hit him, get the ball."]
          ],
          checks: [
            "Ball defender never gives up baseline",
            "Gap defenders are on the line, not denying",
            "Help defenders have their feet in the lane",
            "Everyone moves while the pass is in the air",
            "Closeouts end in short, choppy steps",
            "You can hear \"Ball\" and \"Help\" on every pass",
            "Defense boxes out on every shot",
            "No reaching fouls on drives"
          ],
          cues: ["Move on the pass", "Force middle", "Chop your feet", "Talk every trip"],
          visuals: [
            {
              type: "play",
              name: "The rules in action",
              play: {
                o: { 1: [62, 66], 2: [92, 231], 3: [280, 353], 4: [468, 231], 5: [498, 66] },
                d: { 1: [223, 122], 2: [196, 205], 3: [280, 311], 4: [364, 205], 5: [337, 122] },
                ball: 3,
                steps: [
                  [["pass", "o3", "o4"], ["dmove", "d1", 250, 105], ["dmove", "d2", 257, 148], ["dmove", "d3", 316, 236], ["dmove", "d4", 447, 193], ["dmove", "d5", 414, 107]],
                  [["dribble", "o4", 392, 212], ["dmove", "d4", 372, 190], ["dmove", "d3", 342, 202]],
                  [["pass", "o4", "o5"], ["dmove", "d5", 461, 71], ["dmove", "d4", 372, 141], ["dmove", "d3", 311, 157], ["dmove", "d2", 262, 125], ["dmove", "d1", 254, 82]]
                ],
                captions: [
                  "Ball at the top. Both wings are one pass away, so x2 and x4 are in Gap. The corners are two passes away, so x1 and x5 are in Help.",
                  "Move on the pass: the ball goes to the right wing and all five defenders move while it's in the air. x4 is now on the ball, shaded baseline.",
                  "Force middle: x4 takes away the baseline, so 4 drives middle. He runs right into x3 stepping in from the gap, with x2 and x1 waiting in the lane.",
                  "4 kicks to the corner. Everyone moves again. x5 closes out: sprint, chop your feet, high hand, and push 5 middle. Nobody gets baseline."
                ]
              }
            }
          ],
          floor: "All week: shell drill every practice. Coach will use the checklist on this page to grade each rep.",
          quiz: [
            { q: "When do you move to your new spot?", o: ["After your man catches it", "While the pass is in the air", "When Coach yells", "Only if your man moves"], a: 1, e: "Move on the pass. If you wait for the catch, you're already late." },
            { q: "How should a closeout end?", o: ["Full sprint, jump at the shooter", "Short, choppy steps, high hand, weight back", "Stop at the free-throw line", "Backpedaling"], a: 1, e: "Chop your feet so you can contest the shot and still slide when he drives. Then push him middle." },
            { q: "What does the on-ball defender yell?", o: ["\"Help!\"", "\"Ball!\"", "\"Shot!\"", "Nothing"], a: 1, e: "\"Ball!\" tells everyone you've got the ball. Helpers yell \"Help!\" and everyone yells \"Shot!\" when it goes up." },
            { q: "When is a defensive stop finished?", o: ["When they miss", "When we get the rebound", "When the shot clock runs out", "When they pass it out"], a: 1, e: "A stop isn't a stop until we rebound. Find, hit, get." },
            { q: "If you're not guarding the ball, where is at least one of your feet?", o: ["On the 3-point line", "Inside the pack line", "Touching your man", "On the baseline"], a: 1, e: "Inside the pack line, about 16 feet from the rim. The paint is ours." }
          ]
        }
      ]
    }
  ]
};
