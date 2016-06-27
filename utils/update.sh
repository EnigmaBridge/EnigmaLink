#!/bin/bash
REPODIR="demo-sharing-repo"

# </config>
CDIR=`pwd`
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "${DIR}/${REPODIR}" && \
	git checkout master && \
	git pull origin master && \
	rsync -av --delete "${DIR}/${REPODIR}/public/" "${DIR}/public/htdocs/" && \
	/bin/cp "${DIR}/${REPODIR}/proxy-redir.php" "${DIR}/public/htdocs" && \
	find . -exec chown apache:apache {} \; && \
	find "${DIR}/public" -exec chown apache:apache {} \; && \
	echo -e "[\E[32m\033[1m OK \033[0m] Successfully updated" || \
	echo -e "[\E[31m\033[1mFAIL\033[0m] Update failed"

CACHEDIR=`grep "^ *ModPagespeedFileCachePath" /etc/httpd/conf.d/pagespeed.conf | awk ' { print $2; } ' | sed 's/"//g'`
if [ -n "${CACHEDIR}" ]; then
	touch "${CACHEDIR}/cache.flush"
	chown apache:apache  "${CACHEDIR}/cache.flush"
fi

cd "${CDIR}"
