




export async function buscarCartaScryfall(nombre) {
    const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nombre)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const carta = await res.json();
    const imgs = carta.image_uris ?? carta.card_faces?.[0]?.image_uris ?? {};





    return {
        nombre: carta.name,
        set: carta.set_name,
        idScryfall: carta.id,
        printsSearchUri: carta.prints_search_uri ?? null,
        imagen: imgs.large ?? imgs.normal ?? null,
        imagenes: {
            small: imgs.small ?? null,
            normal: imgs.normal ?? null,
            large: imgs.large ?? null,
            png: imgs.png ?? null,
            artCrop: imgs.art_crop ?? null,
            borderCrop: imgs.border_crop ?? null,
        },

        compra: {
            tcgplayer: { precio: carta.prices?.usd ?? null, moneda: "USD", url: carta.purchase_uris?.tcgplayer ?? null },
            cardmarket: { precio: carta.prices?.eur ?? null, moneda: "EUR", url: carta.purchase_uris?.cardmarket ?? null },
            cardhoarder: { precio: carta.prices?.tix ?? null, moneda: "TIX", url: carta.purchase_uris?.cardhoarder ?? null },
        },
    };
}
export async function buscarPrintsDesdeUri(uri) {
    if (!uri) return [];
    const all = [];
    let next = uri;
    // Follow Scryfall pagination until there are no more pages
    while (next) {
        const res = await fetch(next);
        if (!res.ok) break;
        const json = await res.json();
        const page = (json.data ?? []).map((c) => {
            const imgs = c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {};
            // choose best available image (png > large > normal > art_crop > border_crop > small)
            const bestImg = imgs.png ?? imgs.large ?? imgs.normal ?? imgs.art_crop ?? imgs.border_crop ?? imgs.small ?? null;
            return {
                id: c.id,
                nombre: c.name,
                set: c.set_name,
                numero: c.collector_number,
                imagen: bestImg,
                image_uris: c.image_uris ?? c.card_faces?.[0]?.image_uris ?? {},
                highres: !!c.highres_image,
                precios: {
                    usd: c.prices?.usd,
                    usdFoil: c.prices?.usd_foil,
                    eur: c.prices?.eur,
                    tix: c.prices?.tix,
                },
                url: c.scryfall_uri,
                purchase_uris: c.purchase_uris ?? null,
            };
        });
        all.push(...page);
        if (json.has_more && json.next_page) {
            next = json.next_page;
        } else {
            next = null;
        }
    }

    return all;
}

export async function sugerirNombresScryfall(texto) {
    if (!texto) return [];
    const url = `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(texto)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
}


