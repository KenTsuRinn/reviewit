
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
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

    function elasticOut(t) {
        return (Math.sin((-13.0 * (t + 1.0) * Math.PI) / 2) * Math.pow(2.0, -10.0 * t) + 1.0);
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/AppHeader.svelte generated by Svelte v3.35.0 */
    const file$1 = "src/AppHeader.svelte";

    // (179:12) {:else}
    function create_else_block(ctx) {
    	let i;
    	let i_intro;
    	let i_outro;
    	let current;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-arrow-left spin svelte-k2y06k");
    			add_location(i, file$1, 179, 16, 3804);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (i_outro) i_outro.end(1);
    				if (!i_intro) i_intro = create_in_transition(i, /*spin*/ ctx[3], { duration: 8000 });
    				i_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (i_intro) i_intro.invalidate();
    			i_outro = create_out_transition(i, fade, {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			if (detaching && i_outro) i_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(179:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (177:12) {#if !isRotate}
    function create_if_block(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fas fa-arrow-left svelte-k2y06k");
    			add_location(i, file$1, 177, 16, 3732);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(177:12) {#if !isRotate}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let header;
    	let div0;
    	let span0;
    	let i0;
    	let t0;
    	let span1;
    	let p;
    	let t2;
    	let div2;
    	let button0;
    	let i1;
    	let t3;
    	let span2;
    	let t5;
    	let current_block_type_index;
    	let if_block;
    	let t6;
    	let div1;
    	let a0;
    	let i2;
    	let t7;
    	let span3;
    	let t9;
    	let a1;
    	let i3;
    	let t10;
    	let span4;
    	let t12;
    	let a2;
    	let i4;
    	let t13;
    	let span5;
    	let t15;
    	let a3;
    	let i5;
    	let t16;
    	let span6;
    	let t18;
    	let a4;
    	let i6;
    	let t19;
    	let span7;
    	let t21;
    	let a5;
    	let i7;
    	let t22;
    	let span8;
    	let t24;
    	let div3;
    	let span9;
    	let i8;
    	let t25;
    	let span10;
    	let input;
    	let t26;
    	let div4;
    	let span11;
    	let i9;
    	let t27;
    	let span12;
    	let t29;
    	let span13;
    	let i10;
    	let t30;
    	let span14;
    	let i11;
    	let t31;
    	let span15;
    	let i12;
    	let t32;
    	let div5;
    	let button1;
    	let i13;
    	let span16;
    	let t34;
    	let i14;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*isRotate*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			div0 = element("div");
    			span0 = element("span");
    			i0 = element("i");
    			t0 = space();
    			span1 = element("span");
    			p = element("p");
    			p.textContent = "ReviewIt";
    			t2 = space();
    			div2 = element("div");
    			button0 = element("button");
    			i1 = element("i");
    			t3 = space();
    			span2 = element("span");
    			span2.textContent = "Home";
    			t5 = space();
    			if_block.c();
    			t6 = space();
    			div1 = element("div");
    			a0 = element("a");
    			i2 = element("i");
    			t7 = space();
    			span3 = element("span");
    			span3.textContent = "Home";
    			t9 = space();
    			a1 = element("a");
    			i3 = element("i");
    			t10 = space();
    			span4 = element("span");
    			span4.textContent = "Home";
    			t12 = space();
    			a2 = element("a");
    			i4 = element("i");
    			t13 = space();
    			span5 = element("span");
    			span5.textContent = "Home";
    			t15 = space();
    			a3 = element("a");
    			i5 = element("i");
    			t16 = space();
    			span6 = element("span");
    			span6.textContent = "Home";
    			t18 = space();
    			a4 = element("a");
    			i6 = element("i");
    			t19 = space();
    			span7 = element("span");
    			span7.textContent = "Home";
    			t21 = space();
    			a5 = element("a");
    			i7 = element("i");
    			t22 = space();
    			span8 = element("span");
    			span8.textContent = "Home";
    			t24 = space();
    			div3 = element("div");
    			span9 = element("span");
    			i8 = element("i");
    			t25 = space();
    			span10 = element("span");
    			input = element("input");
    			t26 = space();
    			div4 = element("div");
    			span11 = element("span");
    			i9 = element("i");
    			t27 = space();
    			span12 = element("span");
    			span12.textContent = "|";
    			t29 = space();
    			span13 = element("span");
    			i10 = element("i");
    			t30 = space();
    			span14 = element("span");
    			i11 = element("i");
    			t31 = space();
    			span15 = element("span");
    			i12 = element("i");
    			t32 = space();
    			div5 = element("div");
    			button1 = element("button");
    			i13 = element("i");
    			span16 = element("span");
    			span16.textContent = "User";
    			t34 = space();
    			i14 = element("i");
    			set_style(i0, "float", "left");
    			attr_dev(i0, "class", "fas fa-podcast");
    			add_location(i0, file$1, 166, 12, 3362);
    			attr_dev(span0, "class", "svelte-k2y06k");
    			add_location(span0, file$1, 165, 8, 3342);
    			attr_dev(p, "class", "svelte-k2y06k");
    			add_location(p, file$1, 169, 12, 3460);
    			attr_dev(span1, "class", "svelte-k2y06k");
    			add_location(span1, file$1, 168, 8, 3440);
    			attr_dev(div0, "id", "app-header-logo");
    			attr_dev(div0, "class", "svelte-k2y06k");
    			add_location(div0, file$1, 164, 4, 3306);
    			attr_dev(i1, "class", "fas fa-home svelte-k2y06k");
    			add_location(i1, file$1, 174, 12, 3627);
    			attr_dev(span2, "class", "svelte-k2y06k");
    			add_location(span2, file$1, 175, 12, 3668);
    			attr_dev(button0, "class", "svelte-k2y06k");
    			add_location(button0, file$1, 173, 8, 3546);
    			attr_dev(i2, "class", "fas fa-home");
    			add_location(i2, file$1, 184, 16, 4032);
    			attr_dev(span3, "class", "svelte-k2y06k");
    			add_location(span3, file$1, 186, 16, 4095);
    			attr_dev(a0, "class", "svelte-k2y06k");
    			add_location(a0, file$1, 183, 12, 4011);
    			attr_dev(i3, "class", "fas fa-home");
    			add_location(i3, file$1, 189, 16, 4165);
    			attr_dev(span4, "class", "svelte-k2y06k");
    			add_location(span4, file$1, 191, 16, 4228);
    			attr_dev(a1, "class", "svelte-k2y06k");
    			add_location(a1, file$1, 188, 12, 4144);
    			attr_dev(i4, "class", "fas fa-home");
    			add_location(i4, file$1, 194, 16, 4298);
    			attr_dev(span5, "class", "svelte-k2y06k");
    			add_location(span5, file$1, 196, 16, 4361);
    			attr_dev(a2, "class", "svelte-k2y06k");
    			add_location(a2, file$1, 193, 12, 4277);
    			attr_dev(i5, "class", "fas fa-home");
    			add_location(i5, file$1, 199, 16, 4431);
    			attr_dev(span6, "class", "svelte-k2y06k");
    			add_location(span6, file$1, 201, 16, 4494);
    			attr_dev(a3, "class", "svelte-k2y06k");
    			add_location(a3, file$1, 198, 12, 4410);
    			attr_dev(i6, "class", "fas fa-home");
    			add_location(i6, file$1, 204, 16, 4564);
    			attr_dev(span7, "class", "svelte-k2y06k");
    			add_location(span7, file$1, 206, 16, 4627);
    			attr_dev(a4, "class", "svelte-k2y06k");
    			add_location(a4, file$1, 203, 12, 4543);
    			attr_dev(i7, "class", "fas fa-home");
    			add_location(i7, file$1, 209, 16, 4697);
    			attr_dev(span8, "class", "svelte-k2y06k");
    			add_location(span8, file$1, 211, 16, 4760);
    			attr_dev(a5, "class", "svelte-k2y06k");
    			add_location(a5, file$1, 208, 12, 4676);
    			attr_dev(div1, "id", "app-header-menu-dropdown-list");
    			set_style(div1, "display", /*dropOrNot*/ ctx[0]);
    			attr_dev(div1, "class", "svelte-k2y06k");
    			add_location(div1, file$1, 182, 8, 3928);
    			attr_dev(div2, "id", "app-header-menu");
    			attr_dev(div2, "class", "svelte-k2y06k");
    			add_location(div2, file$1, 172, 4, 3510);
    			attr_dev(i8, "class", "fas fa-search");
    			add_location(i8, file$1, 217, 12, 4887);
    			attr_dev(span9, "class", "svelte-k2y06k");
    			add_location(span9, file$1, 216, 8, 4867);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search");
    			attr_dev(input, "class", "svelte-k2y06k");
    			add_location(input, file$1, 220, 12, 4963);
    			attr_dev(span10, "class", "svelte-k2y06k");
    			add_location(span10, file$1, 219, 8, 4943);
    			attr_dev(div3, "id", "app-header-search");
    			attr_dev(div3, "class", "svelte-k2y06k");
    			add_location(div3, file$1, 215, 4, 4829);
    			attr_dev(i9, "class", "fas fa-fire-alt");
    			add_location(i9, file$1, 225, 12, 5099);
    			attr_dev(span11, "class", "svelte-k2y06k");
    			add_location(span11, file$1, 224, 8, 5079);
    			attr_dev(span12, "class", "svelte-k2y06k");
    			add_location(span12, file$1, 227, 8, 5157);
    			attr_dev(i10, "class", "fab fa-staylinked");
    			add_location(i10, file$1, 231, 12, 5225);
    			attr_dev(span13, "class", "svelte-k2y06k");
    			add_location(span13, file$1, 230, 8, 5205);
    			attr_dev(i11, "class", "fas fa-temperature-high");
    			add_location(i11, file$1, 234, 12, 5305);
    			attr_dev(span14, "class", "svelte-k2y06k");
    			add_location(span14, file$1, 233, 8, 5285);
    			attr_dev(i12, "class", "fas fa-atom");
    			add_location(i12, file$1, 237, 12, 5391);
    			attr_dev(span15, "class", "svelte-k2y06k");
    			add_location(span15, file$1, 236, 8, 5371);
    			attr_dev(div4, "id", "app-header-shortcut");
    			attr_dev(div4, "class", "svelte-k2y06k");
    			add_location(div4, file$1, 223, 4, 5039);
    			attr_dev(span16, "class", "svelte-k2y06k");
    			add_location(span16, file$1, 244, 16, 5540);
    			attr_dev(i13, "class", "fas fa-user svelte-k2y06k");
    			add_location(i13, file$1, 243, 12, 5499);
    			attr_dev(i14, "class", "fas fa-arrow-left svelte-k2y06k");
    			add_location(i14, file$1, 246, 12, 5589);
    			attr_dev(button1, "class", "svelte-k2y06k");
    			add_location(button1, file$1, 242, 8, 5477);
    			attr_dev(div5, "id", "v");
    			attr_dev(div5, "class", "svelte-k2y06k");
    			add_location(div5, file$1, 241, 4, 5455);
    			attr_dev(header, "class", "svelte-k2y06k");
    			add_location(header, file$1, 163, 0, 3292);
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
    			append_dev(header, div2);
    			append_dev(div2, button0);
    			append_dev(button0, i1);
    			append_dev(button0, t3);
    			append_dev(button0, span2);
    			append_dev(button0, t5);
    			if_blocks[current_block_type_index].m(button0, null);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(a0, i2);
    			append_dev(a0, t7);
    			append_dev(a0, span3);
    			append_dev(div1, t9);
    			append_dev(div1, a1);
    			append_dev(a1, i3);
    			append_dev(a1, t10);
    			append_dev(a1, span4);
    			append_dev(div1, t12);
    			append_dev(div1, a2);
    			append_dev(a2, i4);
    			append_dev(a2, t13);
    			append_dev(a2, span5);
    			append_dev(div1, t15);
    			append_dev(div1, a3);
    			append_dev(a3, i5);
    			append_dev(a3, t16);
    			append_dev(a3, span6);
    			append_dev(div1, t18);
    			append_dev(div1, a4);
    			append_dev(a4, i6);
    			append_dev(a4, t19);
    			append_dev(a4, span7);
    			append_dev(div1, t21);
    			append_dev(div1, a5);
    			append_dev(a5, i7);
    			append_dev(a5, t22);
    			append_dev(a5, span8);
    			append_dev(header, t24);
    			append_dev(header, div3);
    			append_dev(div3, span9);
    			append_dev(span9, i8);
    			append_dev(div3, t25);
    			append_dev(div3, span10);
    			append_dev(span10, input);
    			append_dev(header, t26);
    			append_dev(header, div4);
    			append_dev(div4, span11);
    			append_dev(span11, i9);
    			append_dev(div4, t27);
    			append_dev(div4, span12);
    			append_dev(div4, t29);
    			append_dev(div4, span13);
    			append_dev(span13, i10);
    			append_dev(div4, t30);
    			append_dev(div4, span14);
    			append_dev(span14, i11);
    			append_dev(div4, t31);
    			append_dev(div4, span15);
    			append_dev(span15, i12);
    			append_dev(header, t32);
    			append_dev(header, div5);
    			append_dev(div5, button1);
    			append_dev(button1, i13);
    			append_dev(i13, span16);
    			append_dev(button1, t34);
    			append_dev(button1, i14);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*toggleDropdownList*/ ctx[2], false, false, false),
    					listen_dev(button0, "blur", /*toggleDropdownList*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(button0, null);
    			}

    			if (!current || dirty & /*dropOrNot*/ 1) {
    				set_style(div1, "display", /*dropOrNot*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("AppHeader", slots, []);
    	let dropOrNot = "none";
    	let isRotate = false;

    	function toggleDropdownList(event) {
    		$$invalidate(0, dropOrNot = dropOrNot === "none" ? "flex" : "none");
    		$$invalidate(1, isRotate = !isRotate);
    	}

    	function spin(node, { duration }) {
    		return {
    			duration,
    			css: t => {
    				const eased = elasticOut(t);

    				return `
					transform: scale(${eased}) rotate(${eased * 1080}deg);
					color: hsl(
						${~~(t * 360)},
						${Math.min(100, 1000 - 1000 * t)}%,
						${Math.min(50, 500 - 500 * t)}%
					);`;
    			}
    		};
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<AppHeader> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		fade,
    		elasticOut,
    		dropOrNot,
    		isRotate,
    		toggleDropdownList,
    		spin
    	});

    	$$self.$inject_state = $$props => {
    		if ("dropOrNot" in $$props) $$invalidate(0, dropOrNot = $$props.dropOrNot);
    		if ("isRotate" in $$props) $$invalidate(1, isRotate = $$props.isRotate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [dropOrNot, isRotate, toggleDropdownList, spin];
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
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let appheader;
    	let t0;
    	let main0;
    	let t2;
    	let main1;
    	let current;
    	appheader = new AppHeader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(appheader.$$.fragment);
    			t0 = space();
    			main0 = element("main");
    			main0.textContent = "fjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwo";
    			t2 = space();
    			main1 = element("main");
    			main1.textContent = "fjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwofjeiwo";
    			attr_dev(main0, "class", "svelte-bjgltm");
    			add_location(main0, file, 12, 0, 161);
    			attr_dev(main1, "class", "svelte-bjgltm");
    			add_location(main1, file, 13, 0, 302);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(appheader, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, main1, anchor);
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
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(main1);
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
