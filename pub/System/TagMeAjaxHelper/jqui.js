/*Interactive user interface for TagMePlugin, implemented wth JQuery.

  This file  is  Copyright (C) 2010 Paul.W.Harvey@csiro.au - www.taxonomy.org.au
  Centre for Plant Biodiversity Research, CSIRO Plant Industry - www.csiro.au/pi

This program is free software; you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation; either version 2 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU General Public License for more details,
published at http://www.gnu.org/copyleft/gpl.html */

jQuery(document).ready(function () {
   var didCloudHover = false;

   /* Check that tagName exists inList, and if not, POST the action and execute
   ** the finishHandler(tagName) */
   var actOnMissingTag = function (tagName, inList, action, finishHandler) {
     var didModify = false;

     if (jQuery.inArray(tagName, inList) === -1) {
       jQuery('#tagmejqtagstatus').addClass('spinning');
       jQuery.post(foswiki.scriptUrlPath + '/viewauth/' + foswiki.web + 
           '/' + foswiki.topic, { 
           tpaction : action, 
           tptag : tagName, 
           contenttype : 'text/plain', 
           skin : 'tagmejquiajax'
         },
         function (data) { 
           linkifyTagText();
           jQuery('#tagmejqtagstatus').removeClass('spinning');
           finishHandler(tagName);
         }
       );
       didModify = true;
     }

     return didModify;
   }

   /* There must be an easier way to remove the textNode from a span; but
   ** I don't know it... yet. .text('') destroys child elements we want to
   ** keep. */
   var removeTextNodes = function (element) {
      jQuery(element).contents().filter(
        function() {
          if (this.nodeType === Node.TEXT_NODE) {
            this.textContent = '';
          }
        }
      );

      return;
   };
   /* By default, textboxlist doesn't handle hyperlinks in the list items.
   ** This would be much better implemented using some sort of callback, but
   ** textboxlist didn't seem to implement a suitable hook. */
   var linkifyTagText = function () {
    jQuery(
      '#tagmejqcontainer > form > div.jqTextboxListContainer > span:not(.linkified)'
    ).each(
      function (index, tagSpan) {
        theTag = jQuery(tagSpan).text();
        removeTextNodes(tagSpan);
        jQuery(tagSpan).append('<a href="' + foswiki.scriptUrlPath + '/view/' + 
          foswiki.systemWebName + '/TagMeSearch?tag=' + theTag + 
          '" title="Other topics with this tag">' + theTag + '</a>');
        jQuery(tagSpan).addClass('linkified');
      }
    );

    return;
   };

   /* Convert the comma separated list of tags into an array. */
   foswiki.TagMePlugin.jquitags = foswiki.TagMePlugin.jquitags.split(',');

   /* Use Michael Daum's very nifty textboxlist jq plugin to allow the user to
   ** work on tags */
   jQuery("#tagmejqinputfield").textboxlist(
     {
        onSelect: function(input) {
          /* The logic here is a bit odd, started out anticipating a batch rather than
          ** one-by-one POST to updated a modified selection of tags... */
          var selectedTags = input.currentValues;
          var didAdd = false;
          /* If there's a selected tag that isn't in the list of stored tags,
          ** it needs to be added. */
          jQuery.each(selectedTags,
            function (index, tagName) {
              didAdd = actOnMissingTag(tagName, foswiki.TagMePlugin.jquitags, 'add',
                function (tagName) {
                  foswiki.TagMePlugin.jquitags.push(tagName);
                }
              )
            }
          );

          if (!didAdd) {
            /* If there's a stored tag that isn't in the list of selected tags, 
            ** it needs to be removed. */
            jQuery.each(foswiki.TagMePlugin.jquitags,
              function (index, tagName) {
                if (
                  !actOnMissingTag(tagName, selectedTags, 'remove',
                    function (tagName) {
                      foswiki.TagMePlugin.jquitags.pop(tagName);
                    }
                  )
                ) {
                  linkifyTagText();
                }
              }
            );
          }
        },

        autocomplete: foswiki.scriptUrlPath + '/view/' + foswiki.systemWebName + '/TagMeAjaxHelper',
      
        autocompleteOpts: {
          extraParams: {
            section : 'tagquery', 
            contenttype : 'text/plain', 
            skin : 'text'
          },
          autoFill: true,
          matchCase: false,
          multiple: false,
          max: 0,
          mustMatch: false
        }
      }
    );
    linkifyTagText();

    var loadCloud = function (urlExtra) {
      if (typeof(urlExtra) !== 'string') {
        urlExtra = '';
      }
      jQuery('#tagmejqtag').addClass('spinning');
      jQuery('#tagmejqcloud').load(foswiki.scriptUrlPath + '/view/' + 
        foswiki.systemWebName + '/TagMeAjaxHelper?skin=text;contenttype=text/plain;section=cloud' +
          urlExtra,
        function () {
          jQuery('#tagmejqtag').removeClass('spinning');
          jQuery('#tagmejqcloud').modal(
            {
              opacity: 7,
              position: ['50px', null],
              maxWidth: (document.width - 50)
            }
          );
        }
      );
    };

    /* Fire up the tag cloud in a modal dialogue on mouse hover */
    jQuery('#tagmejqtag').hoverIntent(
      {
        over : function () {loadCloud()},

        out: function () {}
      }
    );

    /* Auto-close the tags dialogue after the mouse has wandered over it and
    ** away again. */
    jQuery('#tagmejqcloud').hoverIntent(
      {
        interval : 60,

        over : function () {
          /* Arm the UI to close the dialogue on mouseout */
          didCloudHover = true;
          jQuery('#tagmeCheckboxJustThisWeb').click(function () 
            {
              loadCloud(';tpweb=' + jQuery(this).val());
            }
          );
          jQuery('#tagmeCheckboxJustMe').click(function () 
            {
              loadCloud(';tpuser=me');
            }
          );
        },

        out : function () {
          if (didCloudHover) {
            jQuery.modal.close();
          }
        }
      }
    );
  }
);
