
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/AppHeader.svelte generated by Svelte v3.35.0 */

    const file = "src/AppHeader.svelte";

    function create_fragment$1(ctx) {
    	let header;
    	let div0;
    	let span0;
    	let i0;
    	let t0;
    	let span1;
    	let p;
    	let t2;
    	let div1;
    	let button0;
    	let i1;
    	let span2;
    	let i2;
    	let t4;
    	let div2;
    	let span3;
    	let i3;
    	let t5;
    	let span4;
    	let input;
    	let t6;
    	let div3;
    	let span5;
    	let i4;
    	let t7;
    	let span6;
    	let t9;
    	let span7;
    	let i5;
    	let t10;
    	let span8;
    	let i6;
    	let t11;
    	let span9;
    	let i7;
    	let t12;
    	let div4;
    	let button1;
    	let i8;
    	let span10;
    	let t14;
    	let i9;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div0 = element("div");
    			span0 = element("span");
    			i0 = element("i");
    			t0 = space();
    			span1 = element("span");
    			p = element("p");
    			p.textContent = "fwef";
    			t2 = space();
    			div1 = element("div");
    			button0 = element("button");
    			i1 = element("i");
    			span2 = element("span");
    			span2.textContent = "Home";
    			i2 = element("i");
    			t4 = space();
    			div2 = element("div");
    			span3 = element("span");
    			i3 = element("i");
    			t5 = space();
    			span4 = element("span");
    			input = element("input");
    			t6 = space();
    			div3 = element("div");
    			span5 = element("span");
    			i4 = element("i");
    			t7 = space();
    			span6 = element("span");
    			span6.textContent = "|";
    			t9 = space();
    			span7 = element("span");
    			i5 = element("i");
    			t10 = space();
    			span8 = element("span");
    			i6 = element("i");
    			t11 = space();
    			span9 = element("span");
    			i7 = element("i");
    			t12 = space();
    			div4 = element("div");
    			button1 = element("button");
    			i8 = element("i");
    			span10 = element("span");
    			span10.textContent = "User";
    			t14 = space();
    			i9 = element("i");
    			set_style(i0, "float", "left");
    			attr_dev(i0, "class", "fas fa-podcast");
    			add_location(i0, file, 106, 12, 1865);
    			attr_dev(span0, "class", "svelte-1ifyy4");
    			add_location(span0, file, 105, 8, 1845);
    			attr_dev(p, "class", "svelte-1ifyy4");
    			add_location(p, file, 109, 12, 1963);
    			attr_dev(span1, "class", "svelte-1ifyy4");
    			add_location(span1, file, 108, 8, 1943);
    			attr_dev(div0, "id", "app-header-logo");
    			attr_dev(div0, "class", "svelte-1ifyy4");
    			add_location(div0, file, 104, 4, 1809);
    			attr_dev(i1, "class", "fas fa-home svelte-1ifyy4");
    			add_location(i1, file, 113, 16, 2053);
    			attr_dev(span2, "class", "svelte-1ifyy4");
    			add_location(span2, file, 113, 43, 2080);
    			attr_dev(i2, "class", "fas fa-arrow-left svelte-1ifyy4");
    			add_location(i2, file, 113, 60, 2097);
    			attr_dev(button0, "class", "svelte-1ifyy4");
    			add_location(button0, file, 113, 8, 2045);
    			attr_dev(div1, "id", "app-header-menu");
    			attr_dev(div1, "class", "svelte-1ifyy4");
    			add_location(div1, file, 112, 4, 2009);
    			attr_dev(i3, "class", "fas fa-search");
    			add_location(i3, file, 117, 12, 2215);
    			attr_dev(span3, "class", "svelte-1ifyy4");
    			add_location(span3, file, 116, 8, 2195);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search");
    			attr_dev(input, "class", "svelte-1ifyy4");
    			add_location(input, file, 120, 12, 2291);
    			attr_dev(span4, "class", "svelte-1ifyy4");
    			add_location(span4, file, 119, 8, 2271);
    			attr_dev(div2, "id", "app-header-search");
    			attr_dev(div2, "class", "svelte-1ifyy4");
    			add_location(div2, file, 115, 4, 2157);
    			attr_dev(i4, "class", "fas fa-fire-alt");
    			add_location(i4, file, 125, 12, 2427);
    			attr_dev(span5, "class", "svelte-1ifyy4");
    			add_location(span5, file, 124, 8, 2407);
    			attr_dev(span6, "class", "svelte-1ifyy4");
    			add_location(span6, file, 127, 8, 2485);
    			attr_dev(i5, "class", "fab fa-staylinked");
    			add_location(i5, file, 131, 12, 2553);
    			attr_dev(span7, "class", "svelte-1ifyy4");
    			add_location(span7, file, 130, 8, 2533);
    			attr_dev(i6, "class", "fas fa-temperature-high");
    			add_location(i6, file, 134, 12, 2633);
    			attr_dev(span8, "class", "svelte-1ifyy4");
    			add_location(span8, file, 133, 8, 2613);
    			attr_dev(i7, "class", "fas fa-atom");
    			add_location(i7, file, 137, 12, 2719);
    			attr_dev(span9, "class", "svelte-1ifyy4");
    			add_location(span9, file, 136, 8, 2699);
    			attr_dev(div3, "id", "app-header-shortcut");
    			attr_dev(div3, "class", "svelte-1ifyy4");
    			add_location(div3, file, 123, 4, 2367);
    			attr_dev(span10, "class", "svelte-1ifyy4");
    			add_location(span10, file, 144, 16, 2868);
    			attr_dev(i8, "class", "fas fa-user svelte-1ifyy4");
    			add_location(i8, file, 143, 12, 2827);
    			attr_dev(i9, "class", "fas fa-arrow-left svelte-1ifyy4");
    			add_location(i9, file, 146, 12, 2917);
    			attr_dev(button1, "class", "svelte-1ifyy4");
    			add_location(button1, file, 142, 8, 2805);
    			attr_dev(div4, "id", "v");
    			attr_dev(div4, "class", "svelte-1ifyy4");
    			add_location(div4, file, 141, 4, 2783);
    			attr_dev(header, "class", "svelte-1ifyy4");
    			add_location(header, file, 103, 0, 1795);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div0);
    			append_dev(div0, span0);
    			append_dev(span0, i0);
    			append_dev(div0, t0);
    			append_dev(div0, span1);
    			append_dev(span1, p);
    			append_dev(header, t2);
    			append_dev(header, div1);
    			append_dev(div1, button0);
    			append_dev(button0, i1);
    			append_dev(button0, span2);
    			append_dev(button0, i2);
    			append_dev(header, t4);
    			append_dev(header, div2);
    			append_dev(div2, span3);
    			append_dev(span3, i3);
    			append_dev(div2, t5);
    			append_dev(div2, span4);
    			append_dev(span4, input);
    			append_dev(header, t6);
    			append_dev(header, div3);
    			append_dev(div3, span5);
    			append_dev(span5, i4);
    			append_dev(div3, t7);
    			append_dev(div3, span6);
    			append_dev(div3, t9);
    			append_dev(div3, span7);
    			append_dev(span7, i5);
    			append_dev(div3, t10);
    			append_dev(div3, span8);
    			append_dev(span8, i6);
    			append_dev(div3, t11);
    			append_dev(div3, span9);
    			append_dev(span9, i7);
    			append_dev(header, t12);
    			append_dev(header, div4);
    			append_dev(div4, button1);
    			append_dev(button1, i8);
    			append_dev(i8, span10);
    			append_dev(button1, t14);
    			append_dev(button1, i9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AppHeader", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AppHeader> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class AppHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AppHeader",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.35.0 */

    function create_fragment(ctx) {
    	let appheader;
    	let current;
    	appheader = new AppHeader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(appheader.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(appheader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(appheader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(appheader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(appheader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ AppHeader });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
