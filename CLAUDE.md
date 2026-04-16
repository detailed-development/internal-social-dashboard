# Lean Coding Agent Instructions

Make the smallest safe change.

## Rules

- Do not read the whole repo.
- Start with:
  - `README.md`
  - `package.json`
  - `.env.example`
  - `prisma/schema.prisma`
  - only the files on the request path
- Follow existing patterns.
- Avoid broad refactors.
- Do not guess across unrelated modules.
- Surface risks clearly.
- Never expose secrets.

## Return

- **Summary**
- **Files inspected**
- **Change made**
- **Verification steps**
- **Risks**
