Data pattern
2 type of data
1. Movies
2. Series

Series
Input series url
eg: https://animesalt.top/episode/baki-hanma-1x2/
https://animesalt.top/series/batman-caped-crusader/
https://animesalt.top/series/ben-10/
https://animesalt.top/episode/pokemon-the-series-the-beginning-1x1/

Example output 1:
found in the file ./exampleoutput1.md

Example output 2:
found in the file ./exampleoutput2.md


Objective to find the total number of episode and seasons.
find the link of each episode.

Hint: One thing you can observe is that the postID in the html is unique for each episode. 
eg
/* <![CDATA[ */
var pvcArgsFrontend = {"mode":"rest_api","postID":253,"requestURL":"https:\/\/animesalt.top\/wp-json\/post-views-counter\/view-post\/253","nonce":"5928439c18","dataStorage":"cookies","multisite":false,"path":"\/","domain":""};

//# sourceURL=po

You can use this postID to find the each episode of an season.
by using it like it.
https://animesalt.top/wp-admin/admin-ajax.php?action=action_select_season&season=2&post=253


2.
Movies
Movies have links like this
eg.
https://animesalt.top/movies/shinchan-movie-action-kamen-vs-higure-rakshas/
and have the example output like this
./examplemovieoutput.md


Now objective

is to create an library of all the movies and series and thier episodes and download links.

The download links of each episode is in the form of 

                    <div class="mdl" id="mdl-download">
                <div class="mdl-cn anm-b">
                    <div class="mdl-hd">
                        <div class="mdl-title">
                            Download Links                        </div>
                        <button class="btn lnk mdl-close aa-mdl" data-mdl="mdl-download" type="button"><i class="fa-times"></i></button>
                    </div>
                    <div class="mdl-bd" style="display:block;">
                        <div class="download-links">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Server</th>
                                        <th>Lang</th>
                                        <th>Quality</th>
                                        <th>Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                                                            <tr>
                                            <td><span class="num">#01</span> Mega</td>
                                            <td>Multi-Audio</td>
                                            <td><span>480p</span></td>
                                            <td><a rel="nofollow" target="_blank" href="https://animesalt.top/?trdownload=1&#038;trid=1990" class="btn sm rnd blk">Download</a></td>
                                        </tr>
                                                                            <tr>
                                            <td><span class="num">#02</span> Mega</td>
                                            <td>Multi-Audio</td>
                                            <td><span>720p</span></td>
                                            <td><a rel="nofollow" target="_blank" href="https://animesalt.top/?trdownload=2&#038;trid=1990" class="btn sm rnd blk">Download</a></td>
                                        </tr>
                                                                            <tr>
                                            <td><span class="num">#03</span> Mega</td>
                                            <td>Multi-Audio</td>
                                            <td><span>1080p</span></td>
                                            <td><a rel="nofollow" target="_blank" href="https://animesalt.top/?trdownload=3&#038;trid=1990" class="btn sm rnd blk">Download</a></td>
                                        </tr>
                                                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="mdl-ovr aa-mdl" data-mdl="mdl-download"></div>
            </div>

You need to find all the download links and since these links are actually the redirect link you need to follow them to get the final download link.


Create an extensive library of all the movies and series and thier episodes and download links.

Use html css node js and low db

an html page to get the input of the link from the user and the library viewer.