\# SmartConversations — Canonical Docs



Use the following folders as the canonical source of truth:



\- /docs/smart-conversations/rules/\*.md

\- /docs/smart-conversations/contracts/\*.md

\- /docs/smart-conversations/skills/\*.md

\- /docs/smart-conversations/diagrams/\*.md



Read all markdown files in those folders.



Precedence order:

1\. rules

2\. contracts

3\. skills

4\. diagrams



Interpretation rules:

\- rules = mandatory constraints

\- contracts = formal interfaces and schemas

\- skills = implementation guidance

\- diagrams = visual support



Never override a rule with a skill.

Never override a contract with a diagram.

