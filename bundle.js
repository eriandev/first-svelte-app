
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.20.0 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let form;
    	let span;
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let input;
    	let t3;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			form = element("form");
    			span = element("span");
    			t0 = text(/*pokeName*/ ctx[0]);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Buscar";
    			attr_dev(span, "class", "text-md font-bold text-white");
    			add_location(span, file, 32, 12, 952);
    			attr_dev(img, "class", "mx-auto");
    			if (img.src !== (img_src_value = /*pokeImg*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*pokeName*/ ctx[0]);
    			add_location(img, file, 33, 12, 1026);
    			attr_dev(input, "id", "pokeName");
    			attr_dev(input, "class", "bg-gray-200 hover:bg-white focus:bg-white py-2 px-4 my-2 text-gray-700 leading-tight border border-transparent hover:border-gray-300 focus:border-gray-300 focus:outline-none focus:shadow-outline appearance-none rounded");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Nombre del pokemon");
    			attr_dev(input, "autocomplete", "off");
    			input.required = true;
    			add_location(input, file, 34, 12, 1090);
    			attr_dev(button, "class", "bg-blue-500 hover:bg-blue-400 py-2 px-4 text-white font-bold border-b-4 border-blue-700 hover:border-blue-500 focus:outline-none rounded");
    			add_location(button, file, 35, 12, 1425);
    			attr_dev(form, "id", "pokeForm");
    			add_location(form, file, 31, 8, 878);
    			attr_dev(div0, "class", "w-full");
    			add_location(div0, file, 30, 4, 848);
    			attr_dev(div1, "class", "flex flex-wrap bg-gray-900 h-screen content-center text-center");
    			add_location(div1, file, 29, 0, 766);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, form);
    			append_dev(form, span);
    			append_dev(span, t0);
    			append_dev(form, t1);
    			append_dev(form, img);
    			append_dev(form, t2);
    			append_dev(form, input);
    			append_dev(form, t3);
    			append_dev(form, button);
    			if (remount) dispose();
    			dispose = listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[2]), false, true, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pokeName*/ 1) set_data_dev(t0, /*pokeName*/ ctx[0]);

    			if (dirty & /*pokeImg*/ 2 && img.src !== (img_src_value = /*pokeImg*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*pokeName*/ 1) {
    				attr_dev(img, "alt", /*pokeName*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			dispose();
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
    	let { API } = $$props, { missingName } = $$props, { missingImg } = $$props;
    	let pokeName = "POKEMON";
    	let pokeImg = "images/pokeball.png";

    	function getData(stringToFind) {
    		return fetch(`${API}${stringToFind}`).then(res => res.json());
    	}

    	async function handleSubmit(event) {
    		const textValue = event.target.pokeName.value.trim().toLowerCase();

    		try {
    			const data = await getData(textValue);
    			$$invalidate(0, pokeName = data.name.toUpperCase());
    			$$invalidate(1, pokeImg = data.sprites.front_default);
    		} catch(e) {
    			$$invalidate(0, pokeName = missingName);
    			$$invalidate(1, pokeImg = missingImg);
    		} finally {
    			document.getElementById("pokeForm").reset();
    		}
    	}

    	const writable_props = ["API", "missingName", "missingImg"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("API" in $$props) $$invalidate(3, API = $$props.API);
    		if ("missingName" in $$props) $$invalidate(4, missingName = $$props.missingName);
    		if ("missingImg" in $$props) $$invalidate(5, missingImg = $$props.missingImg);
    	};

    	$$self.$capture_state = () => ({
    		API,
    		missingName,
    		missingImg,
    		pokeName,
    		pokeImg,
    		getData,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ("API" in $$props) $$invalidate(3, API = $$props.API);
    		if ("missingName" in $$props) $$invalidate(4, missingName = $$props.missingName);
    		if ("missingImg" in $$props) $$invalidate(5, missingImg = $$props.missingImg);
    		if ("pokeName" in $$props) $$invalidate(0, pokeName = $$props.pokeName);
    		if ("pokeImg" in $$props) $$invalidate(1, pokeImg = $$props.pokeImg);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pokeName, pokeImg, handleSubmit, API, missingName, missingImg];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { API: 3, missingName: 4, missingImg: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*API*/ ctx[3] === undefined && !("API" in props)) {
    			console.warn("<App> was created without expected prop 'API'");
    		}

    		if (/*missingName*/ ctx[4] === undefined && !("missingName" in props)) {
    			console.warn("<App> was created without expected prop 'missingName'");
    		}

    		if (/*missingImg*/ ctx[5] === undefined && !("missingImg" in props)) {
    			console.warn("<App> was created without expected prop 'missingImg'");
    		}
    	}

    	get API() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set API(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get missingName() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set missingName(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get missingImg() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set missingImg(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const API = 'https://pokeapi.co/api/v2/pokemon/';
    const missingName = 'MissingNa';
    const missingImg = 'images/missingno.png';

    const app = new App({
        target: document.body,
        props: {
            API,
            missingName,
            missingImg,
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
