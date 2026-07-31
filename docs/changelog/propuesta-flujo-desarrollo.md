Installation
Learn how to install neobrutalism components.

1. Initialize shadcn
As explained in introduction, most of these components are based on Shadcn UI.

Visit shadcn docs to see how to initialize shadcn.

Warning
Neobrutalism components doesn't support utility class components anymore, only css variables components. Also, it doesn't matter which baseColor you choose, because it doesn't change the styling.
2. Add styling
Delete the existing styling from your globals.css and paste desired styling.

3. Install components
Install via Shadcn cli
Just choose desired component variant and desired package manager, copy cli command to your terminal and you're good to go. If there is no shadcn cli command on the component page you'll have to install the component manually.

Install manually
In this docs below each component's name you'll have the shadcn docs link for that component.

e.g. You want to install shadcn button component. You'll navigate to button page, click on the shadcn docs link and install the button component like it's shown in the docs.

After you're done you'll come back to neobrutalism button page, and copy button component to your project inside `components/ui/button.tsx`` (this is the default component path) or your custom component path.

Keep in mind that neobrutalism components can have different variants than default shadcn components.

Other components
If the shadcn docs link is not present on the component's page, just copy the component and read the instructions if there are any.


Migrating from V3
Learn how to migrate from v3 to v4.

What's new?
The CLI now initializes projects with Tailwind v4. You can find v3 components here.
All components are updated for Tailwind v4 and React 19.
Removed utility class components.
Visit changelog to see all the changes.

1. Follow the Tailwind v4 Upgrade Guide
Upgrade to Tailwind v4 by following the official upgrade guide
Use the @tailwindcss/upgrade @next codemod to remove deprecated utility classes and update tailwind config.
2. Upgrade your dependencies
Upgrade React dependencies
If you're using Next.js, you can upgrade React and React DOM to the latest version by running the following command:


Copy
npx @next/codemod@canary upgrade latest
Visit Next.js upgrade guide for more info.

Otherwise, you can upgrade React and React DOM to the latest version by running the following command:


Copy
pnpm up react react-dom --latest
Upgrade other dependencies
Copy
pnpm up "@radix-ui/*" cmdk lucide-react recharts tailwind-merge clsx --latest
3. Deprecate tailwindcss-animate
We've deprecated tailwindcss-animate in favor of tw-animate-css, so you'll have to install tw-animate-css and remove tailwindcss-animate from your project.


Copy
pnpm add tw-animate-css
Copy
pnpm remove tailwindcss-animate
4. Update styling
Delete the tailwind config file and paste desired styling to your globals.css file.

5. Set cssVariables to true inside components.json if you haven't already
5. Install v4 components
Install new components like you would usually do.

6. Update old styling (page styling not components)
These are new variable names:


Old variable name	New variable name	Description
bg	background	Background color
bw	secondary-background	Secondary background color
text	foreground	Text color
mtext	main-foreground	Text color when background is set to main
Utility class styling upgrade
Old styling classes	New styling classes
bg-bg dark:bg-darkBg	bg-background
bg-white dark:bg-secondaryBlack	bg-secondary-background
border-border dark:border-darkBorder	border-border
shadow-light dark:shadow-dark	shadow-shadow
text-text dark:text-darkText	text-foreground
text-text	text-main-foreground
CSS Variables classes styling upgrade
Old styling classes	New styling classes
bg-bg	bg-background
bg-bw	bg-secondary-background
text-text	text-foreground
text-mtext	text-main-foreground

https://www.neobrutalism.dev/docs/