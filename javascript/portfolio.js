
(() => {
    const configReady =
        window.PORTFOLIO_SUPABASE_URL &&
        window.PORTFOLIO_SUPABASE_PUBLISHABLE_KEY &&
        window.supabase;

    if (!configReady) {
        console.error("Supabase configuration is missing.");
        return;
    }

    const client = window.supabase.createClient(
        window.PORTFOLIO_SUPABASE_URL,
        window.PORTFOLIO_SUPABASE_PUBLISHABLE_KEY
    );

    const escapeHtml = (value = "") =>
        String(value).replace(/[&<>"']/g, (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });

    const safeUrl = (value) => {
        if (!value) return "";

        try {
            const url = new URL(value, window.location.href);

            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return "";
            }

            return url.href;
        } catch {
            return "";
        }
    };


async function loadResumeLink() {
    const resumeLink = document.getElementById("resume-link");

    if (!resumeLink) return;

    // Keep hidden until the saved URL is verified.
    resumeLink.hidden = true;

    const { data, error } = await client
        .from("site_settings")
        .select("resume_url")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
        console.error("Error loading resume link:", error.message);
        return;
    }

    const url = safeUrl(data?.resume_url);

    if (!url) {
        console.warn("No valid resume URL was found in site_settings.");
        return;
    }

    resumeLink.href = url;
    resumeLink.hidden = false;
}

    const createLink = (url, label) => {
        const validUrl = safeUrl(url);

        if (!validUrl) return "";

        return `
            <a href="${escapeHtml(validUrl)}"
               target="_blank"
               rel="noopener noreferrer">${label}</a>
        `;
    };

    const createCard = (project, index) => {
        const technologies = Array.isArray(project.technologies)
            ? project.technologies
            : [];

        const title = project.title || "Untitled Project";
        const firstTechnology = technologies[0] || "PROJECT";

        const year = project.created_at
            ? new Date(project.created_at).getFullYear()
            : "";

        const projectLinks = [
            createLink(project.github_url, "Source code ↗"),
            createLink(project.live_url, "Live project ↗"),
            createLink(project.video_url, "Watch video ↗"),
            project.slug === "vinance-ai"
              ? '<a href="./Vinance_AI.html">Project details ↗</a>'
              : ""
            ].join("");

        const projectImage = safeUrl(project.image_url);

        const visual = projectImage
            ? `
                <div class="project-visual">
                    <img
                        src="${escapeHtml(projectImage)}"
                        alt="${escapeHtml(title)} project image"
                        loading="lazy"
                    >
                </div>
            `
            : `
                <div class="project-visual visual-fluent">
                    <span class="wordmark">
                        ${escapeHtml(title.slice(0, 2).toUpperCase())}<span>.</span>
                    </span>
                </div>
            `;

        return `
            <article class="project-card">
                <div class="project-index">
                    ${String(index + 1).padStart(2, "0")} /
                    ${escapeHtml(firstTechnology.toUpperCase())}
                </div>

                <div class="project-main">
                    <div class="project-topline">
                        <h3>${escapeHtml(title)}</h3>
                        ${
                            year
                                ? `<span class="project-year">${year}</span>`
                                : ""
                        }
                    </div>

                    <p>${escapeHtml(project.description || "")}</p>

                    <div class="tags">
                        ${technologies
                            .map(
                                (technology) =>
                                    `<span>${escapeHtml(technology)}</span>`
                            )
                            .join("")}
                    </div>

                    <div class="project-links">
                        ${projectLinks}
                    </div>
                </div>

                ${visual}
            </article>
        `;
    };

    const projectList = document.getElementById("project-list");
    const projectCount = document.getElementById("project-count");
    const projectStatus = document.getElementById("project-status");

    if (!projectList) {
        console.error('Could not find the element with id "project-list".');
        return;
    }

    const loadProjects = async () => {
        const { data, error } = await client
            .from("projects")
            .select(
                "id,title,slug,description,image_url,video_url,github_url,live_url,technologies,featured,display_order,created_at"
            )
            .eq("published", true)
            .order("display_order", { ascending: true });

        if (error) {
            console.error("Error loading projects:", error.message);

            if (projectStatus) {
                projectStatus.textContent = "Could not load projects.";
            }

            return;
        }

        if (!data || data.length === 0) {
            if (projectStatus) {
                projectStatus.textContent = "No published projects found.";
            }

            return;
        }

        projectList.innerHTML = data
            .map((project, index) => createCard(project, index))
            .join("");

        if (projectCount) {
            projectCount.textContent =
                `PROJECTS / ${String(data.length).padStart(2, "0")}`;
        }
    };

    loadProjects();
    loadResumeLink();
})();