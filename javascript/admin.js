
(() => {
    const $ = (id) => document.getElementById(id);

    const configOk =
        window.PORTFOLIO_SUPABASE_URL &&
        window.PORTFOLIO_SUPABASE_PUBLISHABLE_KEY &&
        window.supabase;

    const setupWarning = $("setup-warning");

    if (!configOk) {
        setupWarning.classList.remove("hidden");
        return;
    }

    const db = window.supabase.createClient(
        window.PORTFOLIO_SUPABASE_URL,
        window.PORTFOLIO_SUPABASE_PUBLISHABLE_KEY
    );

    const loginPanel = $("login-panel");
    const dashboard = $("dashboard");
    const BUCKET = "project-images";
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

    let previewObjectUrl = null;

    const esc = (s) =>
        String(s ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]);

    function message(id, text, error = false) {
        const el = $(id);
        el.textContent = text;
        el.classList.toggle("error", error);
    }

    function showDashboard(show) {
        loginPanel.classList.toggle("hidden", show);
        dashboard.classList.toggle("hidden", !show);
    }

    function setPreview(url) {
        if (previewObjectUrl) {
            URL.revokeObjectURL(previewObjectUrl);
        }

        previewObjectUrl = url?.startsWith("blob:") ? url : null;

        const container = $("image-preview-container");
        const img = $("image-preview");

        if (!url) {
            img.removeAttribute("src");
            container.classList.add("hidden");
            return;
        }

        img.src = url;
        container.classList.remove("hidden");
    }

    $("image-file").addEventListener("change", () => {
        const file = $("image-file").files[0];

        if (!file) {
            setPreview($("image-url").value);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            $("image-file").value = "";
            setPreview($("image-url").value);
            message(
                "editor-message",
                "Choose a JPG, PNG, or WebP image.",
                true
            );
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            $("image-file").value = "";
            setPreview($("image-url").value);
            message(
                "editor-message",
                "Images must be 5 MB or smaller.",
                true
            );
            return;
        }

        message("editor-message", "");
        setPreview(URL.createObjectURL(file));
    });

    async function uploadImage(file) {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            throw new Error("Choose a JPG, PNG, or WebP image.");
        }

        if (file.size > MAX_IMAGE_SIZE) {
            throw new Error("Images must be 5 MB or smaller.");
        }

        const extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        }[file.type];

        const path = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await db.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = db.storage
            .from(BUCKET)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    function resetForm() {
        $("project-form").reset();
        $("project-id").value = "";
        $("image-url").value = "";
        $("display-order").value = "10";
        $("published").checked = true;
        $("editor-title").textContent = "New project";
        $("editor-label").textContent = "PROJECT EDITOR";

        setPreview(null);
        message("editor-message", "");
    }

    function fillForm(p) {
        $("project-id").value = p.id;
        $("title").value = p.title || "";
        $("slug").value = p.slug || "";
        $("description").value = p.description || "";
        $("long-description").value = p.long_description || "";
        $("technologies").value = (p.technologies || []).join(", ");
        $("image-url").value = p.image_url || "";
        $("github-url").value = p.github_url || "";
        $("video-url").value = p.video_url || "";
        $("live-url").value = p.live_url || "";
        $("display-order").value = p.display_order ?? 0;
        $("featured").checked = !!p.featured;
        $("published").checked = !!p.published;
        $("image-file").value = "";

        setPreview(p.image_url || null);

        $("editor-title").textContent = "Edit project";
        $("editor-label").textContent = "PROJECT EDITOR";

        message("editor-message", "");

        $("editor-title").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    async function loadProjects() {
        message("list-message", "Loading projects…");

        const { data, error } = await db
            .from("projects")
            .select("*")
            .order("display_order", { ascending: true });

        if (error) {
            message("list-message", error.message, true);
            return;
        }

        const list = $("project-list-admin");

        if (!data.length) {
            list.innerHTML =
                '<p class="subtle">No projects yet. Create your first one.</p>';
            message("list-message", "");
            return;
        }

        list.innerHTML = data.map((p) => `
            <article class="admin-project">
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.description)}</p>
                <div class="admin-project-meta">
                    <span class="state-pill ${p.published ? "live" : ""}">
                        ${p.published ? "PUBLISHED" : "DRAFT"}
                    </span>
                    <span class="state-pill">
                        ORDER ${Number(p.display_order) || 0}
                    </span>
                </div>
                <div class="admin-project-actions">
                    <button type="button" data-edit="${esc(p.id)}">
                        Edit
                    </button>
                    <button
                        type="button"
                        data-toggle="${esc(p.id)}"
                        data-published="${p.published ? "true" : "false"}"
                    >
                        ${p.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                        type="button"
                        class="delete"
                        data-delete="${esc(p.id)}"
                    >
                        Delete
                    </button>
                </div>
            </article>
        `).join("");

        message(
            "list-message",
            `${data.length} project${data.length === 1 ? "" : "s"} loaded.`
        );

        list.querySelectorAll("[data-edit]").forEach((b) => {
            b.addEventListener("click", () => {
                fillForm(
                    data.find((p) => String(p.id) === b.dataset.edit)
                );
            });
        });

        list.querySelectorAll("[data-toggle]").forEach((b) => {
            b.addEventListener("click", async () => {
                const p = data.find(
                    (p) => String(p.id) === b.dataset.toggle
                );

                const { error } = await db
                    .from("projects")
                    .update({
                        published: !p.published,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", p.id);

                if (error) {
                    message("list-message", error.message, true);
                } else {
                    await loadProjects();
                }
            });
        });

        list.querySelectorAll("[data-delete]").forEach((b) => {
            b.addEventListener("click", async () => {
                const p = data.find(
                    (p) => String(p.id) === b.dataset.delete
                );

                if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) {
                    return;
                }

                const { error } = await db
                    .from("projects")
                    .delete()
                    .eq("id", p.id);

                if (error) {
                    message("list-message", error.message, true);
                } else {
                    if ($("project-id").value === String(p.id)) {
                        resetForm();
                    }

                    await loadProjects();
                }
            });
        });
    }

    async function syncSession() {
        const {
            data: { session }
        } = await db.auth.getSession();

        showDashboard(!!session);

        if (session) {
            await loadProjects();
            await loadSettings();
        }
    }

    $("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        message("login-message", "Signing in…");

        const { error } = await db.auth.signInWithPassword({
            email: $("email").value.trim(),
            password: $("password").value
        });

        if (error) {
            message("login-message", error.message, true);
            return;
        }

        message("login-message", "");
        await syncSession();
    });

    $("logout").addEventListener("click", async () => {
        await db.auth.signOut();
        showDashboard(false);
        $("password").value = "";
    });

    $("new-project").addEventListener("click", resetForm);
    $("cancel-edit").addEventListener("click", resetForm);

    $("title").addEventListener("input", () => {
        if (!$("project-id").value) {
            $("slug").value = $("title").value
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
        }
    });

    $("project-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const saveButton = $("project-form").querySelector(
            'button[type="submit"]'
        );

        saveButton.disabled = true;
        message("editor-message", "Saving project…");

        try {
            const id = $("project-id").value;
            const file = $("image-file").files[0];

            // Keep the existing image URL unless a replacement is selected.
            let imageUrl = $("image-url").value.trim();

            if (file) {
                message("editor-message", "Uploading image…");
                imageUrl = await uploadImage(file);
            }

            const payload = {
                title: $("title").value.trim(),
                slug: $("slug").value.trim(),
                description: $("description").value.trim(),
                long_description:
                    $("long-description").value.trim() || null,
                technologies: $("technologies").value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                image_url: imageUrl || null,
                github_url: $("github-url").value.trim() || null,
                video_url: $("video-url").value.trim() || null,
                live_url: $("live-url").value.trim() || null,
                display_order: Number($("display-order").value) || 0,
                featured: $("featured").checked,
                published: $("published").checked,
                updated_at: new Date().toISOString()
            };

            const result = id
                ? await db.from("projects").update(payload).eq("id", id)
                : await db.from("projects").insert(payload);

            if (result.error) {
                throw result.error;
            }

            resetForm();

            message(
                "editor-message",
                "Project saved! Your public portfolio will show the updated image."
            );

            await loadProjects();
        } catch (error) {
            message(
                "editor-message",
                error.message || "Something went wrong while saving.",
                true
            );
        } finally {
            saveButton.disabled = false;
        }
    });





    db.auth.onAuthStateChange((_event, session) => {
        showDashboard(!!session);

        if (session) {
            loadProjects();
        }
    });

    syncSession();
})();