<template>
  <nav v-if="menu">
      <template v-for="(item, index) in menu" :key="item && item.title">
        <router-link v-if="typeof item.url === 'string'"
            :to="{ name: item.url }"
            v-slot="{ isActive }"
            class="routing-link mr-8 xl:mr-12 opacity-50 hover:opacity-100"
        >
        <img  v-if="item.icon != null"
            :src="require('@/assets/icons/' + item.icon)"
            :class="isActive 
              ? darkMode
                  ? 'active-green-icon icon-fire-dark-mode'
                  : 'active-green-icon icon-fire-light-mode' 
              : darkMode
                  ? 'icon-fire-dark-mode'
                  : 'icon-fire-light-mode' 
            "
            class="cursor-pointer mr-2 inline-flex"
        />
        <span
            class="font-bold py-0.5"
            :class="{ active: isActive }"
        >{{ item.title }}</span>
        </router-link>

        <span v-else>

            <ul class="w-full">
              <li class="dropdown inline cursor-pointer font-bold text-base tracking-wide relative opacity-50 hover:opacity-100">
                <a class="py-3" :class="index !== menu.length - 1 && 'pr-8'">
                    <img v-if="item.icon != null"
                        :src="require('@/assets/icons/' + item.icon)"
                        :class="isActive ? 'active-green-icon' : ''"
                        class="cursor-pointer mr-2 inline-flex icon-fire"
                    />
                    <span
                        :class="{ active: isActive }"
                    >{{ item.title }}&nbsp;<i v-if="true" class="fas fa-caret-down"></i></span>
                </a>
                <div class="dropdown-menu top-1 absolute hidden h-auto t-8 pt-1">
                  <ul class="block w-45 border py-3" :class="darkMode ? 'dark-mode-background' : 'light-mode-background'">
                      <template v-for="(value, name) in item.url" :key="value && name">
                        <li>

                            <router-link v-if="!value.url.includes('http')"
                                :to="{ name: value.url }"
                                v-slot="{ isActive }"
                                class="routing-link py-3 px-6  opacity-50 hover:opacity-100"
                            >
                            <span
                                :class="{ active: isActive }"
                                >{{ value.title }}</span>
                            </router-link>

                            <a v-else target="_blank" :href="value.url" class="py-3 px-6  opacity-50 hover:opacity-100">
                                <span
                                :class="{ active: isActive }"
                                >{{ value.title }}<sup>&nbsp;<i class="fa fa-external-link"></i></sup></span>
                            </a>

                        </li>
                      </template>
                  </ul>
                </div>
              </li>
            </ul>

        </span>
      </template>

  </nav>
</template>

<script>

import { computed } from "vue";
import {useStore} from "vuex";

import Menu from "@/components/Menu/Menu.js";

export default {
    name: "DesktopMenu",
    setup() {
      const store = useStore();
      const darkMode = computed(() => {
        return store.getters['application/darkMode']
      });
      return {
        darkMode
      };
    },
    mixins: [Menu]
};
</script>

<style scoped lang="scss">
.routing-link {
  display: block;
}

.icon-fire-light-mode {
  height: 22px;
  filter: brightness(0) saturate(100%) opacity(0.4);
  &:hover img {
    filter: brightness(0) saturate(100%);
  }
}

.icon-fire-dark-mode {
  height: 22px;
  filter: brightness(1) saturate(0%) opacity(0.4);
  &:hover img {
    filter: brightness(1) saturate(0%);
  }
}

.dropdown:hover .dropdown-menu {
  display: block;
  z-index: 1;
}

.dropdown .dropdown-menu {
  margin-left: -1.5rem;
  top: 1.75rem;

  // Apply border top to third drop down menu item
  li:nth-child(3n) {
    border-top: 1px solid #ccc;
    margin-top: 10px;
    padding-top: 10px;
  }

  a { display: block; }
}


.pr-8 { padding-right: 3rem; }

.router-link-active {
  opacity: 1;

  .active {
    border-bottom-width: 3px;
  }
}

</style>

