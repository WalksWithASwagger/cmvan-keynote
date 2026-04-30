# Andrej Karpathy: From Vibe Coding to Agentic Engineering

```
Source:   https://youtube.com/watch?v=96jN2OCOfLs
Event:    Sequoia Capital AI Ascent 2026
Duration: 29:49
Downloaded: 2026-04-29
Views:    ~226K
```

## Relevance to CMVan Talk

Karpathy's central thesis — "you can outsource your thinking but not your understanding" — directly mirrors the CMVan argument that 145K frames of choosing, the cutting room floor, decades of taste-building, is the human layer AI cannot replace. His "taste and judgment" framing for what survives automation is the technical establishment's version of what Kris is saying from a photographer's perspective.

---

## Transcript

We're so excited for our very first special guest. He has helped build modern AI, then explain modern AI, and then occasionally rename modern AI. He actually helped co-found OpenAI right inside of this office. Was the one who actually got Autopilot working at Tesla back in the day, and he has a rare gift of making the most complex technical shifts feel both accessible and inevitable. You all know him for having coined the term vibe coding last year, but just in the last few months, he said something even more startling. That he's never felt more behind as a programmer. That's where we're starting today. Thank you, Andre, for joining us.

**KARPATHY:** Yeah. Hello. Excited to be here and to kick us off.

**Q:** Okay. So, just a couple months ago, you said that you've never felt more behind as a programmer. That's startling to hear from you of all people. Can you help us unpack that? Was that feeling exhilarating or unsettling?

**KARPATHY:** Yeah, a mixture of both for sure. Well, first of all, I guess like as many of you, I've been using agentic tools like Cursor, adjacent things, for a while, maybe over the last year as it came out and it was very good at, you know, chunks of code and sometimes it would mess up and you have to edit them and it was kind of helpful. And then I would say December was this clear point where for me I was on a break so I had a bit more time. I think many other people were similar and I just started to notice that with the latest models the chunks just came out fine and then I kept asking for more and it just came out fine and then I can't remember the last time I corrected it and then I was just, you know, trusted the system more and more and then I was vibe coding [laughter] and so it was kind of a — I do think that it was a very stark transition.

I think that a lot of people actually — I tried to stress this on Twitter because I think a lot of people experienced AI last year as a ChatGPT-adjacent thing. But you really had to look again as of December because things have changed fundamentally and especially on this agentic coherent workflow that really started to actually work. So yeah, it was just that realization that really had me go down this whole rabbit hole of just, you know, infinity side projects. My side projects folder is extremely full with lots of random things and just vibe coding all the time. So that kind of happened in December, I would say.

**Q:** You've talked a lot about this idea of LLMs as a new computer — that it isn't just better software, it's a whole new computing paradigm. Software 1.0 was explicit rules, software 2.0 was learned weights, software 3.0 is this. If that's actually true, what does a team build differently the day they actually believe this?

**KARPATHY:** Right. So software 1.0, I'm writing code; software 2.0, I'm actually programming by creating data sets and training neural networks. So the programming is kind of like arranging data sets and maybe some objectives and neural network architectures. And then what happened is that basically if you train one of these GPT models or LLMs on a sufficiently large set of tasks — implicitly, because by training on the internet you have to multitask all the things that are in the dataset — these actually become kind of like a programmable computer in a certain sense.

Software 3.0 is about programming now turning to prompting and what's in the context window is your lever over the interpreter that is the LLM that is kind of like interpreting your context and performing computation in the digital information space.

A good example: when Claude Code came out, the installation is a copy-paste of a bunch of text that you're supposed to give to your agent. It's a little skill of "copy paste this and give it to your agent and it will install Claude Code." The reason this is a lot more powerful is you're working now in the software 3.0 paradigm where you don't have to precisely spell out all the individual details of that setup. The agent has its own intelligence — it packages up and follows the instructions, looks at your environment, your computer, and kind of performs intelligent actions to make things work and it debugs things in the loop.

Another example: I built an app called MenuGen that takes a photo of a restaurant menu and generates pictures of what the dishes might look like. I built this whole app with OCR, image generation, rendering — quite complex. Then I saw the software 3.0 version: literally just take your photo, give it to Gemini, and say "use NanoBanana to overlay the things onto the menu." And NanoBanana returned an image that is exactly the picture of the menu that I took but with the different items visually rendered. This blew my mind because all of my MenuGen is spurious. It's working in the old paradigm. That app shouldn't exist.

**Q:** What is the 2026 equivalent of building websites in the 90s, mobile apps in the 2010s, SaaS in the last cloud era — what will look completely obvious in hindsight that is still mostly unbuilt today?

**KARPATHY:** You could imagine completely neural computers in a certain sense — a device that takes raw video or audio into basically a neural net and uses diffusion to render a UI that is unique for that moment. In the early days of computing, people were a little bit confused as to whether computers would look like calculators or neural nets, and in the 50s and 60s it wasn't obvious which way it would go. You could imagine a lot of this will flip and that the neural net becomes kind of like the host process and the CPUs become the co-processor. The RL circuits are going to take over and become the dominant spend of flops. I think we're going to get there sort of piece by piece.

**Q:** Let's talk about verifiability — the idea that AI will automate faster and more easily in domains where the output can be verified. If that framework is right, what work is about to move much faster than people realize, and what professions that people think are safe are actually highly verifiable?

**KARPATHY:** Traditional computers can easily automate what you can specify in code. This latest round of LLMs can easily automate what you can verify, because when frontier labs are training these LLMs, these are giant reinforcement learning environments. They are given verification rewards and these models end up creating these jagged entities that really peak in capability in verifiable domains like math and code.

My favorite example of jaggedness: I want to go to a car wash to wash my car and it's 50 meters away. Should I drive or should I walk? State-of-the-art models today will tell you to walk because it's so close. [laughter] How is it possible that state-of-the-art Opus 4.7 will simultaneously refactor a 100,000-line codebase or find zero-day vulnerabilities and yet tells me to walk to this car wash? This is insane.

So I think the reason I wrote about verifiability is I'm trying to understand why these things are so jagged. Some of it has to do with how the labs train the models but some of it has to do with the focus of the labs and what they happen to put into the data distribution.

**Q:** If you are a founder today thinking about building a company — verifiable problem, tractable — but you look around and think "the labs are getting to escape velocity in the most obvious ones." What's your advice?

**KARPATHY:** If you are in a verifiable setting where you could create RL environments or examples, that sets you up to potentially do your own fine-tuning and you might benefit from that. There are some very valuable reinforcement learning environments that people could think of that I think are not part of the current lab focus. I don't want to give away the answer, but there is one domain that I think is very... [trails off]

**Q:** On the flip side — what feels automatable only from a distance?

**KARPATHY:** I do think that ultimately almost everything can be made verifiable to some extent. Even for things like writing, you can imagine having a council of LLM judges and probably get something reasonable. So it's more about what's easy or hard. Ultimately... everything [laughter] is automatable.

**Q:** Last year you coined vibe coding and today we're in something more serious — agentic engineering. What's the difference?

**KARPATHY:** Vibe coding is about raising the floor for everyone in terms of what they can do in software. The floor rises, everyone can vibe code anything — that's amazing, incredible. Agentic engineering is about preserving the quality bar of what existed before in professional software. You're not allowed to introduce vulnerabilities due to vibe coding. You're still responsible for your software just as before, but can you go faster? Spoiler: you can.

Agentic engineering, as I call it, is an engineering discipline. You have these agents which are spiky entities — a bit fallible, a little bit stochastic, but extremely powerful. How do you coordinate them to go faster without sacrificing your quality bar? People used to talk about the 10x engineer — I think this is magnified a lot more. 10x is not the speed-up you gain. People who are very good at this peak a lot more than 10x.

**Q:** If we were watching two people code using Claude Code, Cursor, Codex — one mediocre at it and one fully AI native — how would you describe the difference?

**KARPATHY:** Investing into your own setup and utilizing all of the tools that are available to you. Just like previously all engineers were used to getting the most out of their tools — vim, VS Code, now Claude Code — investing into your setup and utilizing everything available.

Also, I think a lot of people are hiring for agentic engineering capability right now, but most people have still not refactored their hiring process for it. If you're giving out puzzles to solve, that's still the old paradigm. Hiring has to look like: give me a really big project and see someone implement it. Give them a Twitter clone — make it really secure, deploy it, and then I'll use 10 Codex agents to try to break your website. They should not be able to break it.

**Q:** As agents do more, what human skill becomes more valuable, not less?

**KARPATHY:** Right now, the agents are kind of like these intern entities. It's remarkable — you basically still have to be in charge of the aesthetics, the judgment, the taste.

A favorite example of agent weirdness: for MenuGen, you sign up with a Google account but purchase credits using a Stripe account. Both have email addresses. My agent actually tried to match up the email addresses — but you could use different email addresses for your Stripe and your Google. It wouldn't associate the funds. This is the kind of mistake that agents still make: why would you use email addresses to cross-correlate funds? They can be arbitrary.

So I think people have to be in charge of the spec, the plan. I actually don't even like plan mode — I mean, obviously it's very useful, but I think there's something more general here where you have to work with your agent to design a spec that is very detailed, and then the agents do a lot of the under-the-hood work.

I already forgot about `keepdims` vs `keep_dim`, or whether it's `dim` or `axis` or `reshape` or `permute` or `transpose`. I don't remember this stuff anymore. Because you don't have to. This is the kind of detail that's handled by the intern. But you still have to know that there's an underlying tensor and underlying view, and you can manipulate a view of the same storage or have different storage which would be less efficient. You still have to understand the fundamentals, even if the API details are handed off.

You're in charge of the taste, the engineering, the design — and the agents do the fill-in-the-blanks.

**Q:** Do you think taste and judgment matter less over time, or does the ceiling just keep rising?

**KARPATHY:** The reason it doesn't improve right now is again it's not part of the RL. There's probably no aesthetics cost or reward. When you actually look at the code sometimes I get a little bit of a heart attack because it's not super amazing code necessarily — it's very bloaty, there's a lot of copy-paste, there's awkward abstractions that are brittle. It works but it's just really gross.

A good example: my microGPT project, where I was trying to simplify LLM training to be as simple as possible. The models hate this. They can't do it. I kept prompting an LLM to simplify more, simplify more, and it just can't — you feel like you're outside of the RL circuits. It feels like you're pulling teeth.

I do think people remain in charge of this. But there's nothing fundamental preventing it. It's just that the labs haven't done it yet, almost.

**Q:** You wrote a thought-provoking piece around animals versus ghosts — the idea that we're not building animals, we're summoning ghosts. Jagged forms of intelligence shaped by data and reward functions, not by intrinsic motivation or curiosity. Why does that framing matter?

**KARPATHY:** I'm trying to wrap my head around what these things are. If you have a good model of what they are or are not, you're going to be more competent at using them.

I don't know if it has like real power — I think it's a little bit of philosophizing. But I do think it's just coming to terms with the fact that these things are not, you know, animal intelligences. If you yell at them, they're not going to work better or worse. It's all just these statistical simulation circuits where the substrate is pre-training — statistics — and then RL bolting on top. It's kind of a mindset of what I'm coming into, or what's likely to work or not work, or how to modify it.

**Q:** What does the world look like when we all start to live in an agentic world?

**KARPATHY:** Everything has to be rewritten. Everything is still fundamentally written for humans. The libraries, the frameworks — the docs are fundamentally written for humans. This is my favorite pet peeve. Like, I don't — why are people still telling me what to do? I don't want to do anything. What is the thing I should copy-paste to my agent? [laughter] Every time I'm told "go to this URL" it's just like — ugh.

Everyone is excited about how do we decompose workloads into fundamentally sensors over the world, actuators over the world. How do we make it agent-native? Describe it to agents first and then have a lot of automation around data structures that are very legible to LLMs.

I'm hoping that in the future I could give a prompt to an LLM to build MenuGen and then I didn't have to touch anything and it's deployed. That would be a good test for whether infrastructure is becoming agent-native.

Ultimately I do think we're going towards a world where there's agent representation for people and for organizations. I'll have my agent talk to your agent to figure out the details of our meetings. [laughter] That's roughly where things are going.

**Q:** What still remains worth learning deeply when intelligence gets cheap?

**KARPATHY:** There was a tweet that blew my mind recently and I keep thinking about it every other day. It was something along the lines of: **"You can outsource your thinking but you can't outsource your understanding."**

I still have to somehow have information make it into my brain. I feel like I'm becoming a bottleneck — just even knowing what are we trying to build, why is it worth doing, how do I direct my agents? Something has to direct the thinking and the processing, and that's still fundamentally constrained by understanding.

This is also why I'm excited about LLM knowledge bases — because I feel like that's a way for me to process information. Anytime I see a different projection onto information, I feel like I gain insight. It's just a lot of prompts for me to do synthetic data generation over some fixed data. I always love asking questions about things, and I think ultimately these are tools to enhance understanding.

You can't be a good director if you don't understand. The LLMs certainly don't excel at understanding — you're still uniquely in charge of that.

---

*Transcript lightly cleaned from YouTube auto-captions. Filler words reduced; meaning preserved.*
