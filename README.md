# Custom Language Abomination (CLA)

## Description

CLA is a dynamically and weakly typed programming language, with no real use beyond being a fun little side-project. <br>
I ~~designed~~ (to be honest there wasn't much designing involved) implemented it with an interpreter written in **TS**. <br>
**TypeScript** may come off as a peculiar choice for such task, but that's the language that I'm most familiar with, besides performance was never on my bullet list.

## Table of Contents

- [Motivation behind CLA](#motivation-behind-cla-and-the-impact-it-had-on-me)
- [Capabilities](#capabilities)
- [Usage](#usage)
- [Disclaimer](#disclaimer)
- [Installation](#installation)
- [Resources](#resources)
- [Dependencies](#dependencies)

## Motivation behind CLA and the impact it had on me

I started working on CLA because I wanted to learn something new.
Instead of reaching for another library, language, or framework, I settled on interpreter creation.
I've always been fascinated with inner workings of programming languages, so I figured I may give it a go.
And give it a go I did, it was an amazing adventure, an experience that taught me a lot.

I started out having no knowledge, nor even the simplest clue of what to do and where to start.
We've all been there at one point, we all know the feeling of confusion and sheer overwhelment when dealing with new and unknown.
And like most of us, over time I managed to overcome those obstacles, and by the end of it I've put together my own language abomination.

The whole experience ended up teaching me soo much, I've gone from being completely green in the field to well... having the slightest clue of what it's all about!
Developers need to constantly sharpen their toolset, we're expected to know all the latest and greatest technologies, In this never-ending vicious cycle I think it's important to step back and try something new, something that may not have any direct impact on your work, something that we'll do for fun, just for the sake of learning.
If you haven't tried anything like that before, I definitely encourage you to do so!

## Capabilities

CLA isn't capable of much, but it does have a few features:

- Single and multi line comments
- Mutable and immutable variables: `var` and `const`
- Logical operators: `||`, `&&`
- Equality operators: `==`, `!=`
- Relational operators: `>`, `>=`, `<`, `<=`
- Assignment operators: `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `||=`, `&&=`
- Arithmetic operators: `+`, `-`, `*`, `/`, `%`
- Unary operators: `typeof x`, `!x`, `++x`, `--x`, `x++`, `x--`
- Ternary operator
- Five data-types: `string`, `number`, `boolean`, `undefined`, `null`
- First class functions and function expressions
- `For`, `while` and `do-while` loops
- `If` and `switch` statements
- Multiple build-in static functions, like: `"Hello".toLowerCase()`
- Multiple build-in native functions, like: `echo("Hello, World!")`
- Array data-structure: `[1, 2, 3]`
- Hash Table data-structure: `{ name: "John", age: 27 }`
- Exception handling system: `throw`, `try` and `catch` statements
- Few additional reserved keywords: `break`, `continue`, `return`, `default`
- Scope

Feature list may seem long at first, but in reality it's a **VERY** simple language. <br>
It has in it just enough for you to write simple scripts (see [codeExamples](./codeExamples)).

## Usage

If you want a hands-on approach, you can refer to [codeExamples](./codeExamples) to get the general idea of this language. <br>
For a more exhaustive feature set, you can go through [tests](./tests).

## Disclaimer

With CLA I ventured into the unknown.
This is my first attempt at writing an interpreter, parser, or even lexer.
With that in mind, bugs are expected to creep in.
And creep in they did.

I equipped myself with automated tests, as a means of bug extermination.
They did help, as I managed to kill a few.
But in the end, more than likely many still linger...

My tests are to blame (they aren't that good) and here's an explanation as to why: [tests-info](./tests/info). <br>
You can run them with: `$ npm run test`

## Installation

**Warning:** CLA requires **Node.js** runtime to be present on the system.

If you want to play around with CLA run these commands:

```
$ git clone https://github.com/MarceliJankowski/custom-language-abomination.git
$ cd ./custom-language-abomination
$ npm install
$ npm start
```

## Resources

Throughout CLA development I used many resources, here's the list of the most notable ones:

- ### Websites:

  - [ASTExplorer](https://astexplorer.net) - this one helped me immensely with modeling AST
  - [cpp-operator-precedence](https://en.cppreference.com/w/cpp/language/operator_precedence) - great cheat sheet

- ### YouTube series:

  - [Porth Development](https://www.youtube.com/watch?v=8QP2fDBIxjM&list=PLpM-Dvs8t0VbMZA7wW9aR3EtBqe2kinu4&ab_channel=TsodingDaily) <br>
    This series sparked my interest in interpreter/compiler design and creation.
    The guy is amazing, he gave me insight into many different programming branches, and he's the reason why I attempted this project in the first place.

  - [How To Build A Programming Language](https://www.youtube.com/watch?v=8VB5TY1sIRo&list=PL_2VhOvlMk4UHGqYCLWc6GO8FaPl8fQTh&ab_channel=tylerlaceby) <br>
    At the beginning of this project, I relied heavily on this one.
    It helped me overcome my initial confusion and gave me directions on where to go.
    At the point of writing this text, (when CLA is finished) 11 episodes of said series have been published, and I learned something from each and every one of them.
    Special thanks to Tyler (the creator), we had a few lengthy discussions on Discord where he helped me wrap my head around some tricky concepts.

- ### Book:

  - [Crafting Interpreters](https://craftinginterpreters.com) by _Robert Nystrom_ <br>
    I discovered this gem quite late in the development process,
    and gem it truly is, as it singlehandedly became my most treasured learning resource.
    It helped me tremendously, and I can't recommend it enough. If you'd like to implement your own interpreter one day, I firmly believe that this is the place to start.

## Dependencies

I wanted to build this project from scratch (intentionally cliche) instead of just managing libraries and wiring them all up, hence I limited myself to the bare minimum of external dependencies.

Here's the list of dependencies that CLA has (excluding dev dependencies):

- TypeScript: ~5.0.4
- json-stringify-pretty-compact: ~3.0.0
- prompt-sync: ~4.2.0
