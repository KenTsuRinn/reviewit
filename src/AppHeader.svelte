<script>

</script>
<style>
    header {
        display: flex;
        gap: 12px;
        align-items: center;
        background-color: #dddddd;
        padding: 0;
    }

    header > div {
        margin: 6px;
        display: inline-block;
    }

    #app-header-logo {
        flex-grow: 0.1;
    }

    #app-header-logo > span {
        display: inline-block;
    }

    #app-header-logo > span > p {
        font-siapp-header-searche: large;
        padding: 0.5em;
    }

    #app-header-menu {
        flex-grow: 1.1;
    }

    #app-header-menu > span {
        display: inline-block;
    }

    #app-header-menu button {
        width: 100%;
        text-align: left;
        border: none;
        background-color: transparent;
    }

    #app-header-menu button span {
        padding: 0.5em;
    }

    #app-header-menu button i.fa-arrow-left {
        float: right;
        margin: 0.2em;
    }

    #app-header-search {
        flex-grow: 0.7;
    }

    #app-header-search > span {
        display: inline-block;
    }

    #app-header-search span:nth-child(2) {
        width: 90%;
    }

    #app-header-search input {
        background-color: transparent;
        border: none;
        width: 100%;
    }

    #app-header-search button span {
        padding: 0.5em;
    }

    #app-header-shortcut {
        flex-grow: 1;
    }

    #app-header-shortcut > span {
        display: inline-block;
        padding: 0.1em;
    }

    #v {
        flex-grow: 1;
    }

    #v button {
        width: 100%;
        text-align: left;
    }

    #v button i:nth-child(1) span {
        padding: 0.5em;
    }
    #v button i:nth-child(2) {
        float: right;
    }


</style>
<header>
    <div id="app-header-logo">
        <span>
            <i style="float: left;" class="fas fa-podcast"></i>
        </span>
        <span>
            <p>fwef</p>
        </span>
    </div>
    <div id="app-header-menu">
        <button><i class="fas fa-home"></i><span>Home</span><i class="fas fa-arrow-left"></i></button>
    </div>
    <div id="app-header-search">
        <span>
            <i class="fas fa-search"></i>
        </span>
        <span>
            <input type="text" placeholder="Search"/>
        </span>
    </div>
    <div id="app-header-shortcut">
        <span>
            <i class="fas fa-fire-alt"></i>
        </span>
        <span>
            |
        </span>
        <span>
            <i class="fab fa-staylinked"></i>
        </span>
        <span>
            <i class="fas fa-temperature-high"></i>
        </span>
        <span>
            <i class="fas fa-atom"></i>
        </span>
    </div>

    <div id="v">
        <button>
            <i class="fas fa-user">
                <span>User</span>
            </i>
            <i class="fas fa-arrow-left"></i>
        </button>
    </div>
</header>