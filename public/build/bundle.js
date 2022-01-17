
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
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
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.1' }, detail), true));
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    var wordList = [
      // Borrowed from xkcd password generator which borrowed it from wherever
      "ability","able","aboard","about","above","accept","accident","according",
      "account","accurate","acres","across","act","action","active","activity",
      "actual","actually","add","addition","additional","adjective","adult","adventure",
      "advice","affect","afraid","after","afternoon","again","against","age",
      "ago","agree","ahead","aid","air","airplane","alike","alive",
      "all","allow","almost","alone","along","aloud","alphabet","already",
      "also","although","am","among","amount","ancient","angle","angry",
      "animal","announced","another","answer","ants","any","anybody","anyone",
      "anything","anyway","anywhere","apart","apartment","appearance","apple","applied",
      "appropriate","are","area","arm","army","around","arrange","arrangement",
      "arrive","arrow","art","article","as","aside","ask","asleep",
      "at","ate","atmosphere","atom","atomic","attached","attack","attempt",
      "attention","audience","author","automobile","available","average","avoid","aware",
      "away","baby","back","bad","badly","bag","balance","ball",
      "balloon","band","bank","bar","bare","bark","barn","base",
      "baseball","basic","basis","basket","bat","battle","be","bean",
      "bear","beat","beautiful","beauty","became","because","become","becoming",
      "bee","been","before","began","beginning","begun","behavior","behind",
      "being","believed","bell","belong","below","belt","bend","beneath",
      "bent","beside","best","bet","better","between","beyond","bicycle",
      "bigger","biggest","bill","birds","birth","birthday","bit","bite",
      "black","blank","blanket","blew","blind","block","blood","blow",
      "blue","board","boat","body","bone","book","border","born",
      "both","bottle","bottom","bound","bow","bowl","box","boy",
      "brain","branch","brass","brave","bread","break","breakfast","breath",
      "breathe","breathing","breeze","brick","bridge","brief","bright","bring",
      "broad","broke","broken","brother","brought","brown","brush","buffalo",
      "build","building","built","buried","burn","burst","bus","bush",
      "business","busy","but","butter","buy","by","cabin","cage",
      "cake","call","calm","came","camera","camp","can","canal",
      "cannot","cap","capital","captain","captured","car","carbon","card",
      "care","careful","carefully","carried","carry","case","cast","castle",
      "cat","catch","cattle","caught","cause","cave","cell","cent",
      "center","central","century","certain","certainly","chain","chair","chamber",
      "chance","change","changing","chapter","character","characteristic","charge","chart",
      "check","cheese","chemical","chest","chicken","chief","child","children",
      "choice","choose","chose","chosen","church","circle","circus","citizen",
      "city","class","classroom","claws","clay","clean","clear","clearly",
      "climate","climb","clock","close","closely","closer","cloth","clothes",
      "clothing","cloud","club","coach","coal","coast","coat","coffee",
      "cold","collect","college","colony","color","column","combination","combine",
      "come","comfortable","coming","command","common","community","company","compare",
      "compass","complete","completely","complex","composed","composition","compound","concerned",
      "condition","congress","connected","consider","consist","consonant","constantly","construction",
      "contain","continent","continued","contrast","control","conversation","cook","cookies",
      "cool","copper","copy","corn","corner","correct","correctly","cost",
      "cotton","could","count","country","couple","courage","course","court",
      "cover","cow","cowboy","crack","cream","create","creature","crew",
      "crop","cross","crowd","cry","cup","curious","current","curve",
      "customs","cut","cutting","daily","damage","dance","danger","dangerous",
      "dark","darkness","date","daughter","dawn","day","dead","deal",
      "dear","death","decide","declared","deep","deeply","deer","definition",
      "degree","depend","depth","describe","desert","design","desk","detail",
      "determine","develop","development","diagram","diameter","did","die","differ",
      "difference","different","difficult","difficulty","dig","dinner","direct","direction",
      "directly","dirt","dirty","disappear","discover","discovery","discuss","discussion",
      "disease","dish","distance","distant","divide","division","do","doctor",
      "does","dog","doing","doll","dollar","done","donkey","door",
      "dot","double","doubt","down","dozen","draw","drawn","dream",
      "dress","drew","dried","drink","drive","driven","driver","driving",
      "drop","dropped","drove","dry","duck","due","dug","dull",
      "during","dust","duty","each","eager","ear","earlier","early",
      "earn","earth","easier","easily","east","easy","eat","eaten",
      "edge","education","effect","effort","egg","eight","either","electric",
      "electricity","element","elephant","eleven","else","empty","end","enemy",
      "energy","engine","engineer","enjoy","enough","enter","entire","entirely",
      "environment","equal","equally","equator","equipment","escape","especially","essential",
      "establish","even","evening","event","eventually","ever","every","everybody",
      "everyone","everything","everywhere","evidence","exact","exactly","examine","example",
      "excellent","except","exchange","excited","excitement","exciting","exclaimed","exercise",
      "exist","expect","experience","experiment","explain","explanation","explore","express",
      "expression","extra","eye","face","facing","fact","factor","factory",
      "failed","fair","fairly","fall","fallen","familiar","family","famous",
      "far","farm","farmer","farther","fast","fastened","faster","fat",
      "father","favorite","fear","feathers","feature","fed","feed","feel",
      "feet","fell","fellow","felt","fence","few","fewer","field",
      "fierce","fifteen","fifth","fifty","fight","fighting","figure","fill",
      "film","final","finally","find","fine","finest","finger","finish",
      "fire","fireplace","firm","first","fish","five","fix","flag",
      "flame","flat","flew","flies","flight","floating","floor","flow",
      "flower","fly","fog","folks","follow","food","foot","football",
      "for","force","foreign","forest","forget","forgot","forgotten","form",
      "former","fort","forth","forty","forward","fought","found","four",
      "fourth","fox","frame","free","freedom","frequently","fresh","friend",
      "friendly","frighten","frog","from","front","frozen","fruit","fuel",
      "full","fully","fun","function","funny","fur","furniture","further",
      "future","gain","game","garage","garden","gas","gasoline","gate",
      "gather","gave","general","generally","gentle","gently","get","getting",
      "giant","gift","girl","give","given","giving","glad","glass",
      "globe","go","goes","gold","golden","gone","good","goose",
      "got","government","grabbed","grade","gradually","grain","grandfather","grandmother",
      "graph","grass","gravity","gray","great","greater","greatest","greatly",
      "green","grew","ground","group","grow","grown","growth","guard",
      "guess","guide","gulf","gun","habit","had","hair","half",
      "halfway","hall","hand","handle","handsome","hang","happen","happened",
      "happily","happy","harbor","hard","harder","hardly","has","hat",
      "have","having","hay","he","headed","heading","health","heard",
      "hearing","heart","heat","heavy","height","held","hello","help",
      "helpful","her","herd","here","herself","hidden","hide","high",
      "higher","highest","highway","hill","him","himself","his","history",
      "hit","hold","hole","hollow","home","honor","hope","horn",
      "horse","hospital","hot","hour","house","how","however","huge",
      "human","hundred","hung","hungry","hunt","hunter","hurried","hurry",
      "hurt","husband","ice","idea","identity","if","ill","image",
      "imagine","immediately","importance","important","impossible","improve","in","inch",
      "include","including","income","increase","indeed","independent","indicate","individual",
      "industrial","industry","influence","information","inside","instance","instant","instead",
      "instrument","interest","interior","into","introduced","invented","involved","iron",
      "is","island","it","its","itself","jack","jar","jet",
      "job","join","joined","journey","joy","judge","jump","jungle",
      "just","keep","kept","key","kids","kill","kind","kitchen",
      "knew","knife","know","knowledge","known","label","labor","lack",
      "lady","laid","lake","lamp","land","language","large","larger",
      "largest","last","late","later","laugh","law","lay","layers",
      "lead","leader","leaf","learn","least","leather","leave","leaving",
      "led","left","leg","length","lesson","let","letter","level",
      "library","lie","life","lift","light","like","likely","limited",
      "line","lion","lips","liquid","list","listen","little","live",
      "living","load","local","locate","location","log","lonely","long",
      "longer","look","loose","lose","loss","lost","lot","loud",
      "love","lovely","low","lower","luck","lucky","lunch","lungs",
      "lying","machine","machinery","mad","made","magic","magnet","mail",
      "main","mainly","major","make","making","man","managed","manner",
      "manufacturing","many","map","mark","market","married","mass","massage",
      "master","material","mathematics","matter","may","maybe","me","meal",
      "mean","means","meant","measure","meat","medicine","meet","melted",
      "member","memory","men","mental","merely","met","metal","method",
      "mice","middle","might","mighty","mile","military","milk","mill",
      "mind","mine","minerals","minute","mirror","missing","mission","mistake",
      "mix","mixture","model","modern","molecular","moment","money","monkey",
      "month","mood","moon","more","morning","most","mostly","mother",
      "motion","motor","mountain","mouse","mouth","move","movement","movie",
      "moving","mud","muscle","music","musical","must","my","myself",
      "mysterious","nails","name","nation","national","native","natural","naturally",
      "nature","near","nearby","nearer","nearest","nearly","necessary","neck",
      "needed","needle","needs","negative","neighbor","neighborhood","nervous","nest",
      "never","new","news","newspaper","next","nice","night","nine",
      "no","nobody","nodded","noise","none","noon","nor","north",
      "nose","not","note","noted","nothing","notice","noun","now",
      "number","numeral","nuts","object","observe","obtain","occasionally","occur",
      "ocean","of","off","offer","office","officer","official","oil",
      "old","older","oldest","on","once","one","only","onto",
      "open","operation","opinion","opportunity","opposite","or","orange","orbit",
      "order","ordinary","organization","organized","origin","original","other","ought",
      "our","ourselves","out","outer","outline","outside","over","own",
      "owner","oxygen","pack","package","page","paid","pain","paint",
      "pair","palace","pale","pan","paper","paragraph","parallel","parent",
      "park","part","particles","particular","particularly","partly","parts","party",
      "pass","passage","past","path","pattern","pay","peace","pen",
      "pencil","people","per","percent","perfect","perfectly","perhaps","period",
      "person","personal","pet","phrase","physical","piano","pick","picture",
      "pictured","pie","piece","pig","pile","pilot","pine","pink",
      "pipe","pitch","place","plain","plan","plane","planet","planned",
      "planning","plant","plastic","plate","plates","play","pleasant","please",
      "pleasure","plenty","plural","plus","pocket","poem","poet","poetry",
      "point","pole","police","policeman","political","pond","pony","pool",
      "poor","popular","population","porch","port","position","positive","possible",
      "possibly","post","pot","potatoes","pound","pour","powder","power",
      "powerful","practical","practice","prepare","present","president","press","pressure",
      "pretty","prevent","previous","price","pride","primitive","principal","principle",
      "printed","private","prize","probably","problem","process","produce","product",
      "production","program","progress","promised","proper","properly","property","protection",
      "proud","prove","provide","public","pull","pupil","pure","purple",
      "purpose","push","put","putting","quarter","queen","question","quick",
      "quickly","quiet","quietly","quite","rabbit","race","radio","railroad",
      "rain","raise","ran","ranch","range","rapidly","rate","rather",
      "raw","rays","reach","read","reader","ready","real","realize",
      "rear","reason","recall","receive","recent","recently","recognize","record",
      "red","refer","refused","region","regular","related","relationship","religious",
      "remain","remarkable","remember","remove","repeat","replace","replied","report",
      "represent","require","research","respect","rest","result","return","review",
      "rhyme","rhythm","rice","rich","ride","riding","right","ring",
      "rise","rising","river","road","roar","rock","rocket","rocky",
      "rod","roll","roof","room","root","rope","rose","rough",
      "round","route","row","rubbed","rubber","rule","ruler","run",
      "running","rush","sad","saddle","safe","safety","said","sail",
      "sale","salmon","salt","same","sand","sang","sat","satellites",
      "satisfied","save","saved","saw","say","scale","scared","scene",
      "school","science","scientific","scientist","score","screen","sea","search",
      "season","seat","second","secret","section","see","seed","seeing",
      "seems","seen","seldom","select","selection","sell","send","sense",
      "sent","sentence","separate","series","serious","serve","service","sets",
      "setting","settle","settlers","seven","several","shade","shadow","shake",
      "shaking","shall","shallow","shape","share","sharp","she","sheep",
      "sheet","shelf","shells","shelter","shine","shinning","ship","shirt",
      "shoe","shoot","shop","shore","short","shorter","shot","should",
      "shoulder","shout","show","shown","shut","sick","sides","sight",
      "sign","signal","silence","silent","silk","silly","silver","similar",
      "simple","simplest","simply","since","sing","single","sink","sister",
      "sit","sitting","situation","six","size","skill","skin","sky",
      "slabs","slave","sleep","slept","slide","slight","slightly","slip",
      "slipped","slope","slow","slowly","small","smaller","smallest","smell",
      "smile","smoke","smooth","snake","snow","so","soap","social",
      "society","soft","softly","soil","solar","sold","soldier","solid",
      "solution","solve","some","somebody","somehow","someone","something","sometime",
      "somewhere","son","song","soon","sort","sound","source","south",
      "southern","space","speak","special","species","specific","speech","speed",
      "spell","spend","spent","spider","spin","spirit","spite","split",
      "spoken","sport","spread","spring","square","stage","stairs","stand",
      "standard","star","stared","start","state","statement","station","stay",
      "steady","steam","steel","steep","stems","step","stepped","stick",
      "stiff","still","stock","stomach","stone","stood","stop","stopped",
      "store","storm","story","stove","straight","strange","stranger","straw",
      "stream","street","strength","stretch","strike","string","strip","strong",
      "stronger","struck","structure","struggle","stuck","student","studied","studying",
      "subject","substance","success","successful","such","sudden","suddenly","sugar",
      "suggest","suit","sum","summer","sun","sunlight","supper","supply",
      "support","suppose","sure","surface","surprise","surrounded","swam","sweet",
      "swept","swim","swimming","swing","swung","syllable","symbol","system",
      "table","tail","take","taken","tales","talk","tall","tank",
      "tape","task","taste","taught","tax","tea","teach","teacher",
      "team","tears","teeth","telephone","television","tell","temperature","ten",
      "tent","term","terrible","test","than","thank","that","thee",
      "them","themselves","then","theory","there","therefore","these","they",
      "thick","thin","thing","think","third","thirty","this","those",
      "thou","though","thought","thousand","thread","three","threw","throat",
      "through","throughout","throw","thrown","thumb","thus","thy","tide",
      "tie","tight","tightly","till","time","tin","tiny","tip",
      "tired","title","to","tobacco","today","together","told","tomorrow",
      "tone","tongue","tonight","too","took","tool","top","topic",
      "torn","total","touch","toward","tower","town","toy","trace",
      "track","trade","traffic","trail","train","transportation","trap","travel",
      "treated","tree","triangle","tribe","trick","tried","trip","troops",
      "tropical","trouble","truck","trunk","truth","try","tube","tune",
      "turn","twelve","twenty","twice","two","type","typical","uncle",
      "under","underline","understanding","unhappy","union","unit","universe","unknown",
      "unless","until","unusual","up","upon","upper","upward","us",
      "use","useful","using","usual","usually","valley","valuable","value",
      "vapor","variety","various","vast","vegetable","verb","vertical","very",
      "vessels","victory","view","village","visit","visitor","voice","volume",
      "vote","vowel","voyage","wagon","wait","walk","wall","want",
      "war","warm","warn","was","wash","waste","watch","water",
      "wave","way","we","weak","wealth","wear","weather","week",
      "weigh","weight","welcome","well","went","were","west","western",
      "wet","whale","what","whatever","wheat","wheel","when","whenever",
      "where","wherever","whether","which","while","whispered","whistle","white",
      "who","whole","whom","whose","why","wide","widely","wife",
      "wild","will","willing","win","wind","window","wing","winter",
      "wire","wise","wish","with","within","without","wolf","women",
      "won","wonder","wonderful","wood","wooden","wool","word","wore",
      "work","worker","world","worried","worry","worse","worth","would",
      "wrapped","write","writer","writing","written","wrong","wrote","yard",
      "year","yellow","yes","yesterday","yet","you","young","younger",
      "your","yourself","youth","zero","zebra","zipper","zoo","zulu"
    ];

    function words(options) {

      function word() {
        if (options && options.maxLength > 1) {
          return generateWordWithMaxLength();
        } else {
          return generateRandomWord();
        }
      }

      function generateWordWithMaxLength() {
        var rightSize = false;
        var wordUsed;
        while (!rightSize) {  
          wordUsed = generateRandomWord();
          if(wordUsed.length <= options.maxLength) {
            rightSize = true;
          }

        }
        return wordUsed;
      }

      function generateRandomWord() {
        return wordList[randInt(wordList.length)];
      }

      function randInt(lessThan) {
        return Math.floor(Math.random() * lessThan);
      }

      // No arguments = generate one word
      if (typeof(options) === 'undefined') {
        return word();
      }

      // Just a number = return that many words
      if (typeof(options) === 'number') {
        options = { exactly: options };
      }

      // options supported: exactly, min, max, join
      if (options.exactly) {
        options.min = options.exactly;
        options.max = options.exactly;
      }
      
      // not a number = one word par string
      if (typeof(options.wordsPerString) !== 'number') {
        options.wordsPerString = 1;
      }

      //not a function = returns the raw word
      if (typeof(options.formatter) !== 'function') {
        options.formatter = (word) => word;
      }

      //not a string = separator is a space
      if (typeof(options.separator) !== 'string') {
        options.separator = ' ';
      }

      var total = options.min + randInt(options.max + 1 - options.min);
      var results = [];
      var token = '';
      var relativeIndex = 0;

      for (var i = 0; (i < total * options.wordsPerString); i++) {
        if (relativeIndex === options.wordsPerString - 1) {
          token += options.formatter(word(), relativeIndex);
        }
        else {
          token += options.formatter(word(), relativeIndex) + options.separator;
        }
        relativeIndex++;
        if ((i + 1) % options.wordsPerString === 0) {
          results.push(token);
          token = ''; 
          relativeIndex = 0;
        }
       
      }
      if (typeof options.join === 'string') {
        results = results.join(options.join);
      }

      return results;
    }

    var randomWords = words;
    // Export the word list as it is often useful
    words.wordList = wordList;

    const getWordOfTheDay = (wordLength) => {
      let word = randomWords();
      return word.length == wordLength ? word : getWordOfTheDay(wordLength);
    };

    const gameWon = (guesses, word) =>
      guesses && guesses[guesses.length - 1] == word;

    const gameLost = (guesses, word) =>
      guesses.length >= 6 && guesses[guesses.length - 1] != word;

    const checkResult = (char, index, answer) => {
      let result = 'X';
      if (char == answer[index]) {
        result = char;
      } else if (answer.includes(char)) {
        result = 'O';
      }

      return colorMap(result);
    };

    const colorMap = (char) => {
      if (char == 'X') {
        return 'white';
      }

      if (char == 'O') {
        return 'lightyellow';
      }

      return 'lightgreen';
    };

    var axios$2 = {exports: {}};

    var bind$2 = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    var bind$1 = bind$2;

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind$1(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils$d = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    var utils$c = utils$d;

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL$2 = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils$c.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils$c.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils$c.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils$c.forEach(val, function parseValue(v) {
            if (utils$c.isDate(v)) {
              v = v.toISOString();
            } else if (utils$c.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    var utils$b = utils$d;

    function InterceptorManager$1() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager$1.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager$1.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager$1.prototype.forEach = function forEach(fn) {
      utils$b.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager$1;

    var utils$a = utils$d;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData$1 = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils$a.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel$1 = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var utils$9 = utils$d;

    var normalizeHeaderName$1 = function normalizeHeaderName(headers, normalizedName) {
      utils$9.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError$1 = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    var enhanceError = enhanceError$1;

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError$2 = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    var createError$1 = createError$2;

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle$1 = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError$1(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var utils$8 = utils$d;

    var cookies$1 = (
      utils$8.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils$8.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils$8.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils$8.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL$1 = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs$1 = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    var isAbsoluteURL = isAbsoluteURL$1;
    var combineURLs = combineURLs$1;

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath$1 = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    var utils$7 = utils$d;

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders$1 = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils$7.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils$7.trim(line.substr(0, i)).toLowerCase();
        val = utils$7.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var utils$6 = utils$d;

    var isURLSameOrigin$1 = (
      utils$6.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils$6.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var utils$5 = utils$d;
    var settle = settle$1;
    var cookies = cookies$1;
    var buildURL$1 = buildURL$2;
    var buildFullPath = buildFullPath$1;
    var parseHeaders = parseHeaders$1;
    var isURLSameOrigin = isURLSameOrigin$1;
    var createError = createError$2;

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils$5.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        if (
          (utils$5.isBlob(requestData) || utils$5.isFile(requestData)) &&
          requestData.type
        ) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = unescape(encodeURIComponent(config.auth.password)) || '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL$1(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils$5.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils$5.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils$5.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var utils$4 = utils$d;
    var normalizeHeaderName = normalizeHeaderName$1;

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils$4.isUndefined(headers) && utils$4.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults$2 = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils$4.isFormData(data) ||
          utils$4.isArrayBuffer(data) ||
          utils$4.isBuffer(data) ||
          utils$4.isStream(data) ||
          utils$4.isFile(data) ||
          utils$4.isBlob(data)
        ) {
          return data;
        }
        if (utils$4.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils$4.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils$4.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults$2.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils$4.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults$2.headers[method] = {};
    });

    utils$4.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults$2.headers[method] = utils$4.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults$2;

    var utils$3 = utils$d;
    var transformData = transformData$1;
    var isCancel = isCancel$1;
    var defaults$1 = defaults_1;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest$1 = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils$3.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils$3.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults$1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    var utils$2 = utils$d;

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig$2 = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
      var defaultToConfig2Keys = [
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
        'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
      ];
      var directMergeKeys = ['validateStatus'];

      function getMergedValue(target, source) {
        if (utils$2.isPlainObject(target) && utils$2.isPlainObject(source)) {
          return utils$2.merge(target, source);
        } else if (utils$2.isPlainObject(source)) {
          return utils$2.merge({}, source);
        } else if (utils$2.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      function mergeDeepProperties(prop) {
        if (!utils$2.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils$2.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      }

      utils$2.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils$2.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        }
      });

      utils$2.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

      utils$2.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils$2.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        } else if (!utils$2.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      utils$2.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys)
        .concat(directMergeKeys);

      var otherKeys = Object
        .keys(config1)
        .concat(Object.keys(config2))
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils$2.forEach(otherKeys, mergeDeepProperties);

      return config;
    };

    var utils$1 = utils$d;
    var buildURL = buildURL$2;
    var InterceptorManager = InterceptorManager_1;
    var dispatchRequest = dispatchRequest$1;
    var mergeConfig$1 = mergeConfig$2;

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios$1(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager(),
        response: new InterceptorManager()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios$1.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig$1(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios$1.prototype.getUri = function getUri(config) {
      config = mergeConfig$1(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios$1.prototype[method] = function(url, config) {
        return this.request(mergeConfig$1(config || {}, {
          method: method,
          url: url
        }));
      };
    });

    utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios$1.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig$1(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios$1;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel$1(message) {
      this.message = message;
    }

    Cancel$1.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel$1.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel$1;

    var Cancel = Cancel_1;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    var utils = utils$d;
    var bind = bind$2;
    var Axios = Axios_1;
    var mergeConfig = mergeConfig$2;
    var defaults = defaults_1;

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios(defaultConfig);
      var instance = bind(Axios.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios;

    // Factory for creating new instances
    axios$1.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios$1.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios$1.Cancel = Cancel_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel$1;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    axios$2.exports = axios$1;

    // Allow use of default import syntax in TypeScript
    axios$2.exports.default = axios$1;

    var axios = axios$2.exports;

    axios.create({
      baseURL: 'https://od-api.oxforddictionaries.com:443/api/v2/lemmas/en-us/',
      timeout: 5000,
      headers: {
        app_id: '687c2edd',
        app_key: '1116af4f33575d46bd0e44d88405e46f',
        Accept: 'application/json',
      },
    });

    const checkInput = (input, guesses) =>
      guesses.length < 6 &&
      input.length == 5 &&
      /^[a-zA-Z]+$/.test(input) &&
      validWord();

    const validWord = async (word) => {

      // const response = await axiosInstance.get(word_id.toLowerCase());

      // console.log(response);

      return true;
    };

    /* src/App.svelte generated by Svelte v3.44.1 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (31:6) {#each guess as char, i}
    function create_each_block_1(ctx) {
    	let div;
    	let t_value = /*char*/ ctx[9] + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "id", "block");
    			set_style(div, "--background-color", checkResult(/*char*/ ctx[9], /*i*/ ctx[11], /*word*/ ctx[3]));
    			attr_dev(div, "class", "svelte-1xulqna");
    			add_location(div, file, 31, 8, 758);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*guesses*/ 2 && t_value !== (t_value = /*char*/ ctx[9] + "")) set_data_dev(t, t_value);

    			if (dirty & /*guesses*/ 2) {
    				set_style(div, "--background-color", checkResult(/*char*/ ctx[9], /*i*/ ctx[11], /*word*/ ctx[3]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(31:6) {#each guess as char, i}",
    		ctx
    	});

    	return block;
    }

    // (29:2) {#each guesses as guess}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*guess*/ ctx[6];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "id", "block_container");
    			attr_dev(div, "class", "svelte-1xulqna");
    			add_location(div, file, 29, 4, 692);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*checkResult, guesses, word*/ 10) {
    				each_value_1 = /*guess*/ ctx[6];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(29:2) {#each guesses as guess}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h10;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let input_1;
    	let input_1_disabled_value;
    	let t4;
    	let p;
    	let t5;
    	let t6_value = 6 - /*guesses*/ ctx[1].length + "";
    	let t6;
    	let t7;
    	let t8;
    	let button;
    	let t9;
    	let button_disabled_value;
    	let t10;
    	let h11;
    	let t11;
    	let t12_value = /*word*/ ctx[3].toLowerCase() + "";
    	let t12;
    	let h11_hidden_value;
    	let mounted;
    	let dispose;
    	let each_value = /*guesses*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			h10 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			input_1 = element("input");
    			t4 = space();
    			p = element("p");
    			t5 = text("Guesses remaining: ");
    			t6 = text(t6_value);
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			button = element("button");
    			t9 = text("Enter");
    			t10 = space();
    			h11 = element("h1");
    			t11 = text("The word is: ");
    			t12 = text(t12_value);
    			attr_dev(h10, "class", "svelte-1xulqna");
    			add_location(h10, file, 23, 1, 494);
    			input_1.disabled = input_1_disabled_value = gameWon(/*guesses*/ ctx[1], /*word*/ ctx[3]);
    			add_location(input_1, file, 24, 2, 519);
    			add_location(p, file, 26, 2, 613);
    			button.disabled = button_disabled_value = gameWon(/*guesses*/ ctx[1], /*word*/ ctx[3]);
    			add_location(button, file, 38, 2, 913);
    			h11.hidden = h11_hidden_value = !gameLost(/*guesses*/ ctx[1], /*word*/ ctx[3]);
    			attr_dev(h11, "class", "svelte-1xulqna");
    			add_location(h11, file, 42, 2, 997);
    			attr_dev(main, "class", "svelte-1xulqna");
    			add_location(main, file, 22, 0, 486);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h10);
    			append_dev(h10, t0);
    			append_dev(h10, t1);
    			append_dev(h10, t2);
    			append_dev(main, t3);
    			append_dev(main, input_1);
    			set_input_value(input_1, /*input*/ ctx[2]);
    			append_dev(main, t4);
    			append_dev(main, p);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(main, t7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			append_dev(main, t8);
    			append_dev(main, button);
    			append_dev(button, t9);
    			append_dev(main, t10);
    			append_dev(main, h11);
    			append_dev(h11, t11);
    			append_dev(h11, t12);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input_1, "input", /*input_1_input_handler*/ ctx[5]),
    					listen_dev(button, "click", /*play*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);

    			if (dirty & /*guesses*/ 2 && input_1_disabled_value !== (input_1_disabled_value = gameWon(/*guesses*/ ctx[1], /*word*/ ctx[3]))) {
    				prop_dev(input_1, "disabled", input_1_disabled_value);
    			}

    			if (dirty & /*input*/ 4 && input_1.value !== /*input*/ ctx[2]) {
    				set_input_value(input_1, /*input*/ ctx[2]);
    			}

    			if (dirty & /*guesses*/ 2 && t6_value !== (t6_value = 6 - /*guesses*/ ctx[1].length + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*guesses, checkResult, word*/ 10) {
    				each_value = /*guesses*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(main, t8);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*guesses*/ 2 && button_disabled_value !== (button_disabled_value = gameWon(/*guesses*/ ctx[1], /*word*/ ctx[3]))) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (dirty & /*guesses*/ 2 && h11_hidden_value !== (h11_hidden_value = !gameLost(/*guesses*/ ctx[1], /*word*/ ctx[3]))) {
    				prop_dev(h11, "hidden", h11_hidden_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
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
    	let input;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	let guesses = [];
    	const word = getWordOfTheDay(5);

    	const play = () => {
    		$$invalidate(2, input = input.toLowerCase());

    		if (checkInput(input, guesses) && !gameWon(guesses, word)) {
    			// guess = input;
    			$$invalidate(1, guesses = [...guesses, input]);

    			$$invalidate(2, input = '');
    		}
    	};

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_1_input_handler() {
    		input = this.value;
    		$$invalidate(2, input);
    	}

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		getWordOfTheDay,
    		gameWon,
    		gameLost,
    		checkResult,
    		checkInput,
    		name,
    		guesses,
    		word,
    		play,
    		input
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    		if ('guesses' in $$props) $$invalidate(1, guesses = $$props.guesses);
    		if ('input' in $$props) $$invalidate(2, input = $$props.input);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(2, input = '');
    	return [name, guesses, input, word, play, input_1_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: '🍎',
      },
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
