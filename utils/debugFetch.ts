
export async function debugFetch(url: string, init?: RequestInit, tag = "[NET]") {
    const bodyPreview =
        typeof init?.body === "string" ? init.body : init?.body ? "<non-string body>" : null

    console.log(`${tag} → ${init?.method ?? "GET"} ${url}`, {
        headers: init?.headers,
        body: bodyPreview,
    })

    try {
        const res = await fetch(url, init)
        const headersObj = Object.fromEntries(res.headers.entries())
        const contentType = res.headers.get("content-type") || ""
        console.log(`${tag} ← ${res.status} ${res.statusText}`, headersObj)

        let payload: any = null
        if (contentType.includes("application/json")) {
            payload = await res.json()
            console.log(`${tag} ← JSON`, payload)
        } else {
            const text = await res.text()
            console.log(`${tag} ← TEXT`, text.slice(0, 1000))
            payload = text
        }
        return { res, payload }
    } catch (err) {
        console.error(`${tag} ❌ fetch failed`, err)
        throw err
    }
}
