# Week 1 Homework — Submission

- [AI Dev Residency — Week 1 Homework (Notion)](https://app.notion.com/p/AI-Dev-Residency-Submission-WEEK-1-HOMEWORK-3f7975c3b95080fab45ecfe3f0fd1705?source=copy_link)

# Links

1. Link to the Github Repository: https://github.com/ValeriyaMetla/AI-Development-Residency
    1. /claude folder
        1. /claude/skills 
    2. CLAUDE.md
    3. /docs/SKILLS-LIBRARY.md
2. Link to Week 1 Coding Challenge: https://github.com/ValeriyaMetla/AI-Development-Residency/tree/main/Week 1 Coding Challenge

# Documents

1. Link to my Notion project page: https://app.notion.com/p/Tech-Fleet-AI-Development-Residency-3f3975c3b95080288a7ccdcd0e21dd1b?source=copy_link

# What I Did

For homework #1: 

1. I have create my repo on Github that is fully connected to Claude. I organized it as following:
    1. At the root: README and CLAUDE
    2. /claude folder contains: 1) all the SKILL files 2) scripts (for logging skill use and synchronising skills at every session) 3) .jason file that contains settings including where the “hooks” that invoke the skills are configured.
    3. I will have folders for each week’s assignments. For now, there is only Week 1 Coding Challenge folder that contains README that points to the main document and this submission you are reading. 
2. I have created set of 9 skills stored as SKILL.md files in the folder claude/skills/<name>/. 
    1. I have build in a hand-off process across reporting lines between skills, where I used *[links]* in each skill file*.* It cross-references and basically functions as a convention for consulting other rleated skills. 
    2. One of the skills I created was for evaluating skills [*skill-evaluation]* that runs evals of synthetic scenarios to check how work is completed with and without a skill, and report on quality. I have tested it too on one of the skills, and it performed well. 
    3. The rest of the skills are across product strategy (3 skills), build quality (3 skills), and security & evaluation (2 skills). 
3. There is also CLAUDE.md file at the root of the repo that load at every session and give instructions to Claude on how to use SKILLs. 
    1. I have implemented *receipts* based on TF’s example (thank you, Morgan!!!) where Claude get a directive to give me a receipt after completing the task what skill was used, why, and what was the process. In addition, I implemented PostToolUse hook in .claude/settings.json to log the skill calls. 
4. I have also created some documentation in the /docs folder: a living document SKILLS-LIBRARY that outlines the governance of SKILLs and is essentially a “source of truth” that I will be updating as I build more skills during the residency. It contains the governance set-up, list of all the current skills, has residency roadmap/planned skills, and organisational chart for skills presented as diagram.

# What I Learned

**I have learned** so much around how to create SKILLs during this homework. I already had an experience with Github, so that was easy for me to set up, but creating skills was fairly new (I attempted before but never did it systematically or went far with it). I have learned how SKILLS work, what is the value, and how to co-create those with AI. My process was to first ask AI to do research and find best practices for each SKILL, after my review and some discussion, I instructed AI to create skills based on the research. I also introduced a review gate, asking Claude to show me drafts of skills for approval before it goes into repo. 

Overall, I learned to trouble-shoot with AI, ask thoughtful questions so I can learn what I don’t know, and to check everything Claude does, including understanding why and how. I certainly got a better sense of what each file in my repo means and does, and I feel more or less organized and knowing the basics. 

**What I will do differently next time?** I think I did lots of trial and error in my earlier attempts with skills before the residency, so this time around I focused on organisation and research before finalising any artefacts. I can do better with my initial instructions, sometimes those were too ambiguous and it took several rounds of correcting the course of discussion. Doing my own research and bringing useful frameworks for skills can improve my outputs also. I am so excited to keep developing my SKILLS library and learning with Claude. 

**How the lessons from this exercise will help me doing project team work in the future?** I believe AI is here to stay and learning to co-create together with it and developing systems, documentation, organisation, and just to work with it cohesively is important precisely because the nature of teamwork is changing as technology evolves. Fast product iterations and AI-assisted work is already here, and learning-by-doing within a team at Tech Fleet is another great thing about this work.
