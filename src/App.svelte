<script>
    import AppHeader from "./AppHeader.svelte";
</script>

<style>
    .main {
        display: flex;
        height: 100%;
        margin: 3em;
        background-color: #3e8e41;

    }

    .posts {
        width: 70%;
    }

    .navbar {
        width: 30%;
        background-color: antiquewhite;
    }

    .post-create-entry {
        border: 1px solid black;
        height: 40%;
        margin: 3em;
        background-color: #999999;
        display: flex;
        align-items: center;
    }

    .post-create-entry .fa-user {
        margin: 0.5em;
    }

    .post-create-entry input {
        width: 90%;
    }

    .post-create-entry .fa-search {
        margin: 0.5em;
    }

    .post {
        margin: 3em;
        border: 1px solid black;
        background-color: azure;
    }
</style>

<AppHeader/>

<div class="main">
    <div class="posts">
        <section class="post-create-entry">
            <i class="fas fa-user">
            </i>
            <input>
            <i class="fas fa-search">
            </i>
            <i class="fas fa-search">
            </i>
        </section>

        <section class="post-create-entry">
            <i class="fas fa-user">
            </i>
            <input>
            <i class="fas fa-search">
            </i>
            <i class="fas fa-search">
            </i>
        </section>

        <section>
           <div class="post">
               <i class="fas fa-user">
               </i>
           </div>
        </section>
    </div>
    <div class="navbar">

    </div>
</div>