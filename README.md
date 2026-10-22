# People Request Compass

I am building a Smart Ticket Classification Engine for my Week 1 Sprint 1 project. The goal is to create a system that receives employee support requests, classifies them into HR, IT, Finance, or Operations, and stores the classified results.

For this task, focus only on designing the system architecture. Do not implement the complete application yet.

Please inspect my existing project before making changes and design a simple, scalable architecture suitable for a beginner-level software engineering project.

The architecture should include these components:

Request submission: accepts a written support request from a user.

Backend/API: receives the request and coordinates processing.

Classification engine: predicts the appropriate category.

Data storage: stores the original request and its classification.

Response handling: returns the predicted category and relevant information to the user.

Requirements:

Create a clear system architecture diagram showing how data flows between the components.

Explain the responsibility of each component in beginner-friendly language.

Show the request flow from submission to classification and storage.

Recommend a suitable technology stack based on my existing project and Lovable's capabilities.

Identify the proposed database structure and API endpoints.

Explain how errors, invalid requests, and uncertain classifications should be handled.

Consider basic security, input validation, and protection of sensitive employee information.

Keep the design simple enough to complete within one sprint.

Do not introduce unnecessary features or rebuild unrelated parts of my project. Do not claim that components are implemented when they are only proposed.

Deliverables: An architecture diagram, a short technical design document, a proposed technology stack, and a clear implementation plan for the remaining three tasks.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f4b5b7a2-d578-4544-abc5-bc68a4cc36d9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
