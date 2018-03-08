/*
	Time Machine - Pushstate history and ajax helper
	@andygrn 2018
*/

( function() {

	'use strict';

	window.TimeMachine = function( inputs ) {

		const debug = inputs.debug ? true : false;

		if ( !( window.history && window.history.pushState ) ) {
			debugLog( 'History API is unsupported - Time Machine disabled' );
			return;
		}

		if ( inputs.defer_page_load && !inputs.beforeNewPageLoad ) {
			debugLog( 'Missing beforeNewPageLoad callback means page will never load - add callback or disable defer_page_load', 'warn' );
			return;
		}

		const host_regex = new RegExp( '^' + window.location.protocol + '//' + window.location.host, 'i' );
		const title_element = document.querySelector( 'title' );
		let state_change_in_progress = false;

		window.addEventListener( 'popstate', handleStateChange, false );
		window.addEventListener( 'click', handlePotentialTriggerClick, false );

		debugLog( 'Ready' );
		debugLog( '------' );

		function debugLog( message, type ) {
			if ( !debug || !console ) {
				return;
			}
			message = 'Time Machine: ' + message;
			if ( console[type || 'log'] ) {
				console[type || 'log']( message );
			}
		}

		function pushStateChange( url ) {
			if ( state_change_in_progress ) {
				debugLog( 'Page load already in progress, ignoring' );
				debugLog( '------' );
				return;
			}
			debugLog( 'Pushing new state "' + url + '"' );
			state_change_in_progress = true;
			window.history.pushState( {}, null, url );
			handleStateChange();
		}

		function handleStateChange() {
			debugLog( 'State change detected' );
			if ( inputs.defer_page_load ) {
				debugLog( 'Deferring page load' );
				debugLog( 'Running "beforeNewPageLoad" callback' );
				inputs.beforeNewPageLoad( ( custom_headers ) => {
					getUrlViaAjax( window.location.href, custom_headers );
				}, () => {
					state_change_in_progress = false;
				} );
				return;
			}
			if ( inputs.beforeNewPageLoad ) {
				debugLog( 'Running "beforeNewPageLoad" callback' );
				inputs.beforeNewPageLoad();
			}
			getUrlViaAjax( window.location.href );
		}

		function handlePotentialTriggerClick( event ) {
			if ( !event.target.hasAttribute( 'href' ) ) {
				return;
			}
			const path = event.target.href.replace( host_regex, '' );
			if ( path[0] !== '/' ) {
				return;
			}
			event.preventDefault();
			pushStateChange( event.target.href );
		}

		function onLoadSuccess( data ) {
			debugLog( 'Page successfully loaded' );
			inputs.ajax_receptacle.innerHTML = data;
			const metadata_element = inputs.ajax_receptacle.querySelector( inputs.metadata_element_selector );
			const title = metadata_element.getAttribute( 'data-tm-title' );
			const page_id = metadata_element.getAttribute( 'data-tm-id' );
			runPageScripts( inputs.ajax_receptacle );
			setTitle( title );
			highlightNav( page_id );
			if ( inputs.afterNewPageLoad ) {
				debugLog( 'Running "afterNewPageLoad" callback' );
				let page_data = null;
				try {
					page_data = JSON.parse( metadata_element.getAttribute( 'data-tm-data' ) );
				} catch ( e ) {
					debugLog( 'Malformed JSON in page data attribute, ignoring', 'warn' );
				}
				inputs.afterNewPageLoad( page_data );
			}
			state_change_in_progress = false;
			debugLog( 'Done' );
			debugLog( '------' );
		}

		function onLoadFail() {
			debugLog( 'Page failed to load, turning back time...', 'warn' );
			state_change_in_progress = false;
			window.history.back();
			debugLog( '------' );
		}

		function runPageScripts( container ) {
			debugLog( 'Running page scripts' );
			const page_scripts = container.querySelectorAll( 'script' );
			for ( let i = 0; i < page_scripts.length; i += 1 ) {
				( new Function( page_scripts[i].innerHTML ) ).call( window );
			}
		}

		function setTitle( title ) {
			title = ( typeof title === 'undefined' ? '' : title );
			debugLog( 'Setting page title to "' + title + '"' );
			title_element.innerHTML = title;
		}

		function highlightNav( page_id ) {
			if ( typeof inputs.nav_items === 'undefined' || inputs.nav_items.length === 0 ) {
				return;
			}
			debugLog( 'Highlighting navigation item "' + page_id + '"' );
			for ( let i = 0; i < inputs.nav_items.length - 1; i += 1 ) {
				const match_id = inputs.nav_items[i].getAttribute( 'data-tm-match' );
				if ( match_id === page_id ) {
					inputs.nav_items[i].classList.add( inputs.nav_selected_class );
					continue;
				}
				inputs.nav_items[i].classList.remove( inputs.nav_selected_class );
			}
		}

		function getUrlViaAjax( url, headers ) {
			if ( !url ) {
				return;
			}
			debugLog( 'Requesting new page "' + url + '"' );
			headers = headers || [];
			const xmlhr = new XMLHttpRequest();
			let request_completed = false;
			xmlhr.open( 'GET', url, true );
			xmlhr.setRequestHeader( 'X-Requested-With', 'XMLHttpRequest' );
			for ( let i = 0; i < headers.length; i += 1 ) {
				xmlhr.setRequestHeader( headers[i][0], headers[i][1] );
			}
			xmlhr.addEventListener( 'readystatechange', () => {
				if ( xmlhr.readyState === 4 && !request_completed ) {
					if ( ( xmlhr.status >= 200 && xmlhr.status < 300 ) || xmlhr.status === 304 ) {
						onLoadSuccess( xmlhr.response );
					} else {
						onLoadFail();
					}
					request_completed = true;
				}
			}, false );
			setTimeout( () => {
				if ( request_completed ) {
					return;
				}
				request_completed = true;
				onLoadFail();
			}, 8000 );
			xmlhr.send( null );
		}

		return {
			pushStateChange: pushStateChange,
			setTitle: setTitle
		};

	};

} )();