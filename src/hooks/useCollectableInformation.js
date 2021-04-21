import { ref, computed, watch, onBeforeUnmount } from 'vue';

import useWeb3 from "@/connectors/hooks";
import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, parseEther } from "@ethersproject/units";

import useContractEvents from "@/hooks/useContractEvents";
import useExchangeRate from "@/hooks/useExchangeRate.js";
import orderBy from "lodash/orderBy";

import {
    COLLECTABLE_TYPE,
    COLLECTABLE_STATE,
} from "@/constants/Collectables.js";
import PURCHASE_TYPE from "@/constants/PurchaseTypes.js";

export default function useCollectableInformation(initialCollectable = {}) {
    const { converEthToUSD } = useExchangeRate();
    const {
        mergedEvents,
        initializeContractEvents,
        supply,
        endsAt: updatedEndsAt,
    } = useContractEvents();

    const collectable = ref(initialCollectable);
    const events = ref(collectable.value.events || []);
    const price = ref(0.0);
    const nextBidPrice = ref(0.0);
    const priceUSD = ref(0.0);
    const priceUSDSold = ref(0.0);
    const progress = ref(0.0);
    const items = ref(0);
    const itemsOf = ref(0);
    const collectableState = ref(COLLECTABLE_STATE.WAITING);

    const type = computed(() => collectable.value.type);
    const media = computed(() => collectable.value.media);
    const firstMedia = computed(() => { // Use preview image or first
        if (!media.value) return '';
        const found = media.value.find(v => v.is_preview);

        if (found) {
            return found.url;
        }
        let orderedMedia = orderBy(media.value, 'position', "asc")
        return orderedMedia[0].url || '';
    });
    const gallerySortedMedia = computed(() => collectable.value.mediaSorted);
    const artist = computed(() => collectable.value.artist);
    const artistStatement = computed(() => collectable.value.artist_statement);
    const title = computed(() => collectable.value.title);
    const description = computed(() => collectable.value.description);
    const version = computed(() => collectable.value.version);
    const is_sold_out = computed(
        () => {
            if (isAuction.value) return false;
            return collectableState.value === COLLECTABLE_STATE.OUT_OF_STOCK;
        }
    );
    const is_closed = computed(() => {
        return collectable.value ? collectable.value.is_closed : false;
    });
    const isCollectableActive = computed(() => {
        return (
            collectableState.value === COLLECTABLE_STATE.WAITING ||
            collectableState.value === COLLECTABLE_STATE.IN_PROGRESS
        );
    });
    const edition = computed(() => collectable.value.edition || 0);
    const edition_of = computed(() => collectable.value.edition_of || 0);
    const isTangible = computed(
        () =>
            type.value === COLLECTABLE_TYPE.TANGIBLE ||
            type.value === COLLECTABLE_TYPE.TANGIBLE_NFT
    );
    const isNft = computed(
        () =>
            type.value === COLLECTABLE_TYPE.NFT ||
            type.value === COLLECTABLE_TYPE.TANGIBLE_NFT
    );
    const liveStatus = computed(() => {
        if (collectableState.value === COLLECTABLE_STATE.CLOSED) return "closed";
        if (collectableState.value === COLLECTABLE_STATE.DONE) return "ended";
        if (collectableState.value === COLLECTABLE_STATE.WAITING)
            return "coming soon";
        if (collectableState.value === COLLECTABLE_STATE.OUT_OF_STOCK) {
            if (!isAuction.value) {
                return "sold out";
            }
        }

        return "live";
    });
    const startsAt = computed(() => collectable.value.starts_at);
    const endsAt = computed(() => collectable.value.ends_at);
    const isAuction = computed(
        () => collectable.value.purchase_type === PURCHASE_TYPE.AUCTION
    );
    const isUpcomming = computed(() => collectableState.value === COLLECTABLE_STATE.WAITING);


    const updateProgress = function (event) {
        progress.value = event;
        updateCollectableState();
    };

    const updateInformation = function (data) {
        collectable.value.ends_at = data.ends_at;
        events.value = data.events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const latestEvent = events.value[events.value.length - 1];

        if (data.media && data.media.length) {
            const sorted = [...data.media].sort((a, b) => a.position < b.position ? -1 : 1).filter(m => !m.is_preview);
            collectable.value.mediaSorted = sorted;
        } else {
            collectable.value.mediaSorted = [];
        }

        // AUCTION
        if (isAuction.value) {
            if (events.value.length === 0) {
                price.value = +(data.start_bid || 0);
                nextBidPrice.value = price.value;
                priceUSD.value = +(data.value_in_usd || converEthToUSD(price.value)).toFixed(2);
            } else {
                price.value = +(latestEvent.value || 0);
                nextBidPrice.value = +((latestEvent.value || 0) * 1.05);
                priceUSD.value = +(latestEvent.value_in_usd || converEthToUSD(price.value)).toFixed(2);
            }
        }
        if (isAuction.value) {
            // Remove rounding errors in nextBidPrice // 1.000000000001
            nextBidPrice.value = +nextBidPrice.value.toFixed(7);
        }

        // SALE
        if (!isAuction.value) {
            itemsOf.value = data.available_qty || 0;
            items.value = supply.value
                ? supply.value
                : itemsOf.value - (events.value || [])
                    .reduce((carry, evt) => {
                        if (evt.amount) {
                            return parseInt(evt.amount) + carry;
                        }
                        if (evt.raw && typeof evt.raw == "string") {
                            let decodedEvt = JSON.parse(evt.raw);
                            return parseInt(decodedEvt.amount) + carry;
                        }
                        return carry;
                    }, 0);

            price.value = +(data.price || 0).toFixed(2);
            priceUSD.value = +(data.value_in_usd || 0).toFixed(2);
            priceUSDSold.value = (events.value || [])
                .reduce((carry, evt) => {
                    if (evt.value_in_usd) {
                        return carry + evt.value_in_usd;
                    }
                    if (evt.value) {
                        return evt.value + carry;
                    }
                    if (evt.amount) {
                        return carry + (evt.amount * converEthToUSD(price.value));
                    }
                    if (evt.raw && typeof evt.raw == "string") {
                        let decodedEvt = JSON.parse(evt.raw);
                        return (carry + (decodedEvt.amount) * converEthToUSD(price.value));
                    }
                    return carry;
                }, 0).toFixed(2);

            progress.value = items.value === 0 || !items.value
                ? 0
                : items.value / itemsOf.value;
        }
    };

    const updateCollectableState = function () {
        const now = Date.now();
        const start = new Date(startsAt.value);
        const end = new Date(endsAt.value);

        if (is_closed.value) {
            collectableState.value = COLLECTABLE_STATE.CLOSED;
            return;
        }

        if (now < start) {
            collectableState.value = COLLECTABLE_STATE.WAITING;
            return;
        }

        if (now > end) {
            collectableState.value = COLLECTABLE_STATE.DONE;
            return;
        }

        if (!isAuction.value) {
            if (items.value === 0) {
                collectableState.value = COLLECTABLE_STATE.OUT_OF_STOCK;
                return;
            }
        }

        if (now >= start && now < end) {
            collectableState.value = COLLECTABLE_STATE.IN_PROGRESS;
            return;
        }

        collectableState.value = COLLECTABLE_STATE.WAITING;
    };

    let timeoutHandler = null;
    const enableContract = function () {
        if (collectable.value == null) return;

        const now = Date.now();
        const start = new Date(startsAt.value).getTime() - (15 * 60 * 1000);
        let endDate = new Date(endsAt.value);
        endDate.setHours(endDate.getHours() + 6);
        const end = endDate.getTime();
        if (now >= start && now < end && !is_sold_out.value) {
            console.log('contract initialized');
            initializeContractEvents(collectable.value);
        } else if (now < end && !is_sold_out.value) {
            timeoutHandler = setTimeout(() => {
                console.log('starting soon');
                initializeContractEvents(collectable.value);
            }, start - now);
        }
    };

    const setCollectable = function (data) {
        collectable.value = data;
        updateInformation(data);
        updateCollectableState();
        enableContract(data);
    };

    if (collectable.value.type != null) {
        setCollectable(collectable.value);
    }

    const updateFromBlockchain = function (newEvents) {
        // console.log('updateFromBlockchain', newEvents);
        events.value = newEvents;
        let endsAtNew = endsAt.value;
        // Update price and item count
        if (isAuction.value) {
            if (updatedEndsAt.value != null) {
                endsAtNew = new Date(updatedEndsAt.value).toString();
            }
        }

        updateInformation({
            ...collectable.value,
            events: [...events.value],
            ends_at: endsAtNew,
        });
        updateCollectableState();
    };

    // Blockchain watchers
    watch(mergedEvents, updateFromBlockchain);

    onBeforeUnmount(() => {
        if (timeoutHandler != null) {
            clearTimeout(timeoutHandler);
            timeoutHandler = null;
        }
    });

    return {
        collectableState,
        collectable,
        price,
        priceUSD,
        priceUSDSold,
        nextBidPrice,
        items,
        itemsOf,
        progress,
        isCollectableActive,
        // Static
        type,
        media,
        firstMedia,
        gallerySortedMedia,
        artist,
        artistStatement,
        title,
        description,
        events,
        startsAt,
        endsAt,
        liveStatus,
        is_sold_out,
        is_closed,
        edition,
        edition_of,
        isTangible,
        isNft,
        isAuction,
        isUpcomming,
        version,
        // Methods
        updateProgress,
        setCollectable,
        updateInformation,
        updateCollectableState,
    };
}
