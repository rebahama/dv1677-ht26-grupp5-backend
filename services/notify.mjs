export async function sendNotification(message) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn("Discord webhook URL is not configured");
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: message,
            }),
        });

        if (!response.ok) {
            console.error(
                `Discord notification failed: ${response.status}`
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error("Discord notification error:", error.message);
        return false;
    }
}