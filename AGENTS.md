<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project decisions

- All ticket category logic (ids, names, descriptions, examples, zod validation) lives in `src/lib/categories.ts` as the single source of truth — the classifier, UI and the future database check constraint must derive from it and never hardcode ids. Why: the brief requires one central, extensible configuration and no silent invalid categories.
